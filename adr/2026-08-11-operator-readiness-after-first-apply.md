# Operator readiness signals the first completed apply

- Status: accepted

Technical Story: [#3419](https://github.com/linode/apl-core/issues/3419) / [PR #3464](https://github.com/linode/apl-core/pull/3464)

## Context and Problem Statement

The `apl-operator` Deployment used `pgrep -f 'apl-operator'` as its `readinessProbe` — it only proved the process existed. The Deployment therefore became `Available` about 30 seconds after the pod started, while the platform install still needed another 10-15 minutes. `helm install --wait` and `kubectl wait --for=condition=Available` returned far too early, so bootstrap automation either continued against a half-installed platform or polled ArgoCD and pod state and guessed.

## Decision Drivers

- Bootstrap automation needs one machine-checkable signal, usable with the standard `helm`/`kubectl` wait mechanisms.
- The signal must never claim a convergence that did not happen.
- It must not flap. The reconcile loop applies every ~5 minutes in steady state.
- Reuse state the operator already tracks; do not introduce a CRD for this.

## Considered Options

- Poll `auth.<domainSuffix>/ready` (oauth2-proxy behind the ingress) from outside the cluster — rejected: needs public DNS and a trusted certificate, cannot distinguish "not ready yet" from a DNS/cert/ingress fault, does not fix the misleading probe, and says nothing about which revision was applied.
- Add an `AplStatus` CR with conditions and `lastSuccessfulReconcile` — better long-term answer, but out of scope here; this decision makes the existing signal truthful instead of adding a CRD.
- Write a readiness marker file at the end of the helmfile install — rejected during review: the install ends before the ArgoCD Applications exist.
- Write a readiness marker file after the first successful apply run (chosen).

## Decision Outcome

Chosen option: mark readiness after a successful apply run.

`markOperatorReady()` (`src/operator/k8s.ts`) writes `/tmp/ready`, and is called from the success path of `runApplyIfNotBusy()` (`src/operator/apl-operator.ts`), next to the existing `/tmp/heartbeat` liveness marker. The `readinessProbe` on both operator Deployments (`chart/apl` for the install, `charts/apl-operator` via helmfile, which had no readiness probe at all) tests for that file.

The apply run is the point where the ArgoCD Applications get created, so past it the platform can heal itself through ArgoCD. That is what "the operator is ready" means here — it is explicitly **not** "the platform is fully up"; ArgoCD is still syncing at that moment.

Three properties are deliberate:

- **It latches for the life of the pod.** The marker is never cleared by a later apply — flipping `Available` on every reconcile pass would make the condition useless as a gate. Per-apply status stays in the `apl-operator-state` ConfigMap (`commitHash`, `status`, `trigger`), which answers "did the operator apply _my_ commit?".
- **It fails closed.** `markOperatorReady()` never throws; if the marker cannot be written, or the apply keeps failing, the pod stays NotReady and `--wait` times out loudly.
- **`progressDeadlineSeconds` is raised to 1800.** At the 600s default, `kubectl rollout status` would report `ProgressDeadlineExceeded` on a perfectly healthy first install.

### Positive Consequences

- `helm install apl … --wait` and `kubectl wait --for=condition=Available deployment/apl-operator` are now truthful gates; no bespoke poll loop needed per adopter.
- No new loop, process, interval or CRD — the marker rides on the apply cycle that already runs.

### Negative Consequences

- Behaviour change for existing `--wait` callers: they now block for the real install duration instead of ~30 seconds. Helm's 5m default timeout is too short, so `--timeout` must be sized accordingly (`NOTES.txt` prints this).
- The marker lives on the pod's `/tmp` emptyDir. It survives a container restart within the pod, but a rescheduled or rolled-out pod goes NotReady until it completes an apply of its own.

## Links

- `src/operator/EXECUTION_FLOW.md` — "Readiness and Convergence Contract" describes the resulting contract and the introspection ConfigMaps.