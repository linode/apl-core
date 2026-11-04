#!/usr/bin/env python
"""Reconcile Grafana Git Sync repositories with manifests collected by k8s-sidecar.

k8s-sidecar writes every key of the labelled Secrets/ConfigMaps into FOLDER and
runs this script after each change. The script applies every
provisioning.grafana.app/v0alpha1 Repository found there through the Grafana API
and deletes repositories it created earlier whose manifest is gone.
Repositories without the managed-by label (e.g. created in the UI) are never
touched.
"""

import base64
import fcntl
import hashlib
import json
import os
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request

import yaml

API_GROUP_VERSION = "provisioning.grafana.app/v0alpha1"
KIND = "Repository"
MANAGED_LABEL = "app.kubernetes.io/managed-by"
MANAGED_VALUE = "grafana-repository-sidecar"
SPEC_CHECKSUM = "grafana-repository-sidecar/spec-checksum"
SECURE_CHECKSUM = "grafana-repository-sidecar/secure-checksum"

FOLDER = os.environ.get("FOLDER", "/tmp/repositories")
API_URL = os.environ.get("REPOSITORY_SYNC_API_URL", "http://localhost:3000").rstrip("/")
API_NAMESPACE = os.environ.get("REPOSITORY_SYNC_NAMESPACE", "default")
API_TIMEOUT = int(os.environ.get("REPOSITORY_SYNC_TIMEOUT", "300"))
SKIP_TLS_VERIFY = os.environ.get("REPOSITORY_SYNC_SKIP_TLS_VERIFY", "false").lower() == "true"
HEALTH_PORT = os.environ.get("HEALTH_PORT", "8080")
USERNAME = os.environ.get("REQ_USERNAME", "")
PASSWORD = os.environ.get("REQ_PASSWORD", "")

COLLECTION = f"{API_URL}/apis/{API_GROUP_VERSION}/namespaces/{API_NAMESPACE}/repositories"
DEFERRED_MARKER = os.path.join(FOLDER, ".repository-sync.deferred")
LOCK_FILE = os.path.join(FOLDER, ".repository-sync.lock")


def _log_stream():
    # k8s-sidecar captures the script output and only prints it with LOG_LEVEL=DEBUG.
    # Write to the stdout of the sidecar process instead, so the sync shows up in the container logs.
    try:
        return open("/proc/1/fd/1", "a", buffering=1)
    except OSError:
        return sys.stderr


LOG = _log_stream()


def log(level, msg):
    print(f"{time.strftime('%Y-%m-%dT%H:%M:%S%z')} {level} repository-sync: {msg}", file=LOG, flush=True)


class ApiError(Exception):
    def __init__(self, status, body):
        super().__init__(f"HTTP {status}: {body}")
        self.status = status


def api(method, url, body=None):
    headers = {"Accept": "application/json"}
    if USERNAME or PASSWORD:
        credentials = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
        headers["Authorization"] = f"Basic {credentials}"
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    context = ssl._create_unverified_context() if SKIP_TLS_VERIFY else None
    try:
        with urllib.request.urlopen(request, timeout=30, context=context) as response:
            raw = response.read()
    except urllib.error.HTTPError as e:
        raise ApiError(e.code, e.read().decode(errors="replace").strip()) from None
    return json.loads(raw) if raw else {}


def sidecar_ready():
    # k8s-sidecar answers 503 "NOT READY" on /healthz until its initial list of all resources is done.
    try:
        with urllib.request.urlopen(f"http://localhost:{HEALTH_PORT}/healthz", timeout=5) as response:
            return response.status == 200
    except urllib.error.HTTPError as e:
        return "NOT READY" not in e.read().decode(errors="replace")
    except OSError:
        # No health server to ask, do not wait for it.
        return True


def grafana_ready():
    api("GET", COLLECTION + "?limit=1")
    return True


def wait_for(check, what, timeout=API_TIMEOUT):
    deadline = None if timeout is None else time.monotonic() + timeout
    delay = 1
    while True:
        try:
            if check():
                return
            reason = "not ready"
        except (ApiError, OSError) as e:
            reason = str(e)
        if deadline is not None and time.monotonic() >= deadline:
            raise TimeoutError(f"{what} not available after {timeout}s: {reason}")
        log("INFO", f"waiting for {what} ({reason}), retrying in {delay}s")
        time.sleep(delay)
        delay = min(delay * 2, 30)


def checksum(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def load_manifests():
    """Return ({name: manifest}, complete). complete is False if anything could not be used."""
    manifests, complete = {}, True
    for filename in sorted(os.listdir(FOLDER)):
        path = os.path.join(FOLDER, filename)
        if filename.startswith(".") or not os.path.isfile(path):
            continue
        try:
            with open(path) as f:
                docs = [doc for doc in yaml.safe_load_all(f) if doc is not None]
        except (OSError, yaml.YAMLError) as e:
            log("ERROR", f"{filename}: cannot parse file: {' '.join(str(e).split())}")
            complete = False
            continue
        for doc in docs:
            if not isinstance(doc, dict) or doc.get("apiVersion") != API_GROUP_VERSION or doc.get("kind") != KIND:
                log("ERROR", f"{filename}: skipping document, expected apiVersion {API_GROUP_VERSION} and kind {KIND}")
                complete = False
                continue
            name = (doc.get("metadata") or {}).get("name")
            if not name:
                log("ERROR", f"{filename}: skipping {KIND} without metadata.name")
                complete = False
                continue
            if name in manifests:
                log("ERROR", f"{filename}: duplicate {KIND} {name}, keeping the first one")
                complete = False
                continue
            manifests[name] = doc
    return manifests, complete


def desired_object(name, manifest, existing=None):
    metadata = manifest.get("metadata") or {}
    labels = dict(metadata.get("labels") or {})
    labels[MANAGED_LABEL] = MANAGED_VALUE
    annotations = dict(metadata.get("annotations") or {})
    annotations[SPEC_CHECKSUM] = checksum([manifest.get("spec"), metadata.get("labels"), metadata.get("annotations")])
    annotations[SECURE_CHECKSUM] = checksum(manifest.get("secure"))
    obj = {
        "apiVersion": API_GROUP_VERSION,
        "kind": KIND,
        "metadata": {"name": name, "namespace": API_NAMESPACE, "labels": labels, "annotations": annotations},
        "spec": manifest.get("spec") or {},
    }
    if existing is not None:
        obj["metadata"]["resourceVersion"] = existing["metadata"]["resourceVersion"]
    stored_secure_checksum = (existing or {}).get("metadata", {}).get("annotations", {}).get(SECURE_CHECKSUM)
    if manifest.get("secure") and stored_secure_checksum != annotations[SECURE_CHECKSUM]:
        # Grafana stores a new secure value every time secure.*.create is sent and keeps
        # the stored values if secure is omitted, so only send it when it changed.
        obj["secure"] = manifest["secure"]
    return obj


def apply(name, manifest):
    url = f"{COLLECTION}/{name}"
    try:
        existing = api("GET", url)
    except ApiError as e:
        if e.status != 404:
            raise
        api("POST", COLLECTION, desired_object(name, manifest))
        log("INFO", f"created repository {name}")
        return

    existing_metadata = existing.get("metadata", {})
    managed = existing_metadata.get("labels", {}).get(MANAGED_LABEL) == MANAGED_VALUE
    if not managed:
        log("WARN", f"repository {name} already exists and was not created by this sidecar, taking it over")
    want = desired_object(name, manifest, existing)
    have_annotations = existing_metadata.get("annotations", {})
    if managed and all(have_annotations.get(k) == want["metadata"]["annotations"][k]
                       for k in (SPEC_CHECKSUM, SECURE_CHECKSUM)):
        return
    api("PUT", url, want)
    log("INFO", f"updated repository {name}" + (" including secure values" if "secure" in want else ""))


def prune(manifests):
    errors = 0
    selector = urllib.request.quote(f"{MANAGED_LABEL}={MANAGED_VALUE}")
    for item in api("GET", f"{COLLECTION}?labelSelector={selector}").get("items", []):
        metadata = item.get("metadata", {})
        name = metadata.get("name")
        if metadata.get("labels", {}).get(MANAGED_LABEL) != MANAGED_VALUE or name in manifests:
            continue
        if metadata.get("deletionTimestamp"):
            continue
        try:
            api("DELETE", f"{COLLECTION}/{name}")
            log("INFO", f"deleted repository {name}, its manifest is gone")
        except ApiError as e:
            log("ERROR", f"deleting repository {name} failed: {e}")
            errors += 1
    return errors


def sync(timeout):
    wait_for(grafana_ready, f"Grafana API at {API_URL}", timeout)
    manifests, complete = load_manifests()
    errors = 0 if complete else 1
    for name, manifest in manifests.items():
        try:
            apply(name, manifest)
        except ApiError as e:
            log("ERROR", f"applying repository {name} failed: {e}")
            errors += 1
    if complete:
        errors += prune(manifests)
    else:
        log("WARN", "not deleting any repositories because some manifests could not be read")
    return errors


def locked_sync(timeout=API_TIMEOUT):
    try:
        with open(LOCK_FILE, "w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            errors = sync(timeout)
    except Exception as e:  # pylint: disable=broad-except
        log("ERROR", f"sync failed: {e}")
        return 1
    log("INFO" if errors == 0 else "ERROR", f"sync of {API_NAMESPACE} finished with {errors} error(s)")
    return 1 if errors else 0


def deferred_sync():
    try:
        wait_for(sidecar_ready, "initial sidecar sync")
    except TimeoutError as e:
        log("ERROR", str(e))
        return 1
    finally:
        os.unlink(DEFERRED_MARKER)
    # Nothing triggers another run after the initial sync, so wait as long as Grafana needs to start.
    return locked_sync(timeout=None)


def main():
    if sys.argv[1:] == ["--deferred"]:
        return deferred_sync()

    if not sidecar_ready():
        # The sidecar runs the script after each resource type and namespace of its initial list.
        # Syncing now could delete repositories whose manifests just are not written yet, so sync
        # once in the background when the initial list is done. This also keeps the sidecar from
        # blocking while Grafana is still starting.
        log("INFO", "initial sidecar sync in progress, syncing repositories once it is done")
        subprocess.Popen([sys.executable, os.path.abspath(__file__), "--deferred"],
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         start_new_session=True)
        return 0

    return locked_sync()


if __name__ == "__main__":
    sys.exit(main())
