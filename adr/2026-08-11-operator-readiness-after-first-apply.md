# Operator readiness signals the first completed apply

- Status: accepted

Technical Story: [#3419](https://github.com/linode/apl-core/issues/3419) / [PR #3464](https://github.com/linode/apl-core/pull/3464)

The operator's readiness probe checked that the operator process was alive, so the Deployment reported Available around 30 seconds after the pod started while the install still had 10-15 minutes to run. `helm install --wait` and `kubectl wait --for=condition=Available` returned against a half-installed platform, and anyone who needed the real signal polled ArgoCD Applications and pod states and guessed. Readiness is now tied to the operator completing its first apply run: the apply success path writes a marker file, and the readiness probe checks for it.

## What ready means here

The first apply run is where the ArgoCD Applications get created. Past that point the platform converges without the operator, so Ready means "handed over to ArgoCD", not "platform is up" — ArgoCD is still syncing when the probe first succeeds. The install itself is not a usable signal: it finishes before any ArgoCD Application exists.

Writing the marker cannot fail an apply — errors are logged and swallowed. If it cannot be written, or applies keep failing, the pod stays NotReady and the caller's wait times out. There is no path to a false Ready.

`progressDeadlineSeconds` is 1800, because at the 600s default `kubectl rollout status` reports `ProgressDeadlineExceeded` during a healthy first install.

## `gateOnReadiness`

Gating on the install changes timing for anyone already passing `--wait`: 30 seconds becomes the full install, and Helm's 5 minute default timeout is too short for that. The probe is therefore selected by the chart value `operator.readiness.gateOnReadiness`, default `false`.

| | readiness probe | Available after |
|---|---|---|
| `false` | operator process alive | ~30s |
| `true` | marker file present | first successful apply |

Upgrades keep their current timing. Automation that wants a real gate opts in and sizes its timeout for at least 30 minutes.

## Rejected

Polling `auth.<domainSuffix>/ready` from outside the cluster needs public DNS and a trusted certificate before it can run at all, and a failed request is indistinguishable from a DNS, certificate or ingress fault.

An `AplStatus` CR with conditions and a `lastSuccessfulReconcile` timestamp is the better long-term model, but it is a much bigger change than making the existing probe honest, and it does not work with `kubectl wait --for=condition=Available`.

## Known limitation

The marker lives on the pod's `/tmp` emptyDir. It survives a container restart in the same pod, but a rescheduled or rolled-out pod is NotReady until it completes an apply of its own — up to one reconcile interval.

## Links

- `src/operator/EXECUTION_FLOW.md` — "Readiness and Convergence Contract"
