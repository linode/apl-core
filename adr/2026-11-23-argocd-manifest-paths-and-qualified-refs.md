# ArgoCD Applications declare their manifest paths and use fully qualified git references

- Status: accepted

ArgoCD caches generated manifests per git commit, so every commit to the values repo re-renders every Application sourced from it, and ArgoCD polls every 15 seconds. APL now sets the `argocd.argoproj.io/manifest-generate-paths` annotation on every Application it generates, so that an Application is re-rendered only when a commit touches the paths it reads, and writes the revisions it controls as fully qualified git references, so that ArgoCD does not search every branch and tag to resolve them. The annotation is known to interact with an open ArgoCD regression; that risk is accepted and a platform-wide switch is provided to turn the annotation off.

Implementation is tracked in #3886.

## Decision Outcome

### Annotation

All generated Application classes are annotated: Core app Applications, gitops-ns Applications, the Application for the global directory, Team values Applications, Team GitOps Applications and Team workload Applications.

- All classes except Team workload Applications use `.`, which ArgoCD resolves relative to each source's own path.
- A Team workload Application uses `.` plus the absolute path in the values repo of each values file it reads: its values file, and its managed values file when an image update strategy is enabled.

The two-part value is deliberate. ArgoCD applies one annotation to every source of a multi-source Application. A value that lists only values-repo paths makes ArgoCD treat changes to the chart source as irrelevant and silently not deploy them. Exact file paths are used, not the team's workload values folder, so that one workload's change does not re-render its siblings.

Core app Applications and Team GitOps Applications gain little from the annotation: the platform revision does not move on a released platform, and a Team GitOps Application syncs its whole repository. They are annotated so that every generated Application follows one rule.

### Fully qualified references

- The values repo branch is written as `refs/heads/<branch>` on every Application source that targets the values repo. The prefix is added where the Application's target revision is written, not to the branch setting itself, because the image updater's write-back branch reads the same setting and needs the plain branch name.
- The platform revision is qualified by one rule: a value shaped like a release version (`v` followed by a semantic version, pre-release suffixes included) becomes `refs/tags/<value>`; anything else, including a commit SHA or a branch-derived build tag, is passed through unchanged. The value alone does not say whether it is a tag, a branch or a commit, so only the unambiguous shape is qualified.
- The apl-operator's self-update check compares the target revision of its own Core app Application with the expected platform revision by string equality and pauses the apply when they differ. The check and the Core app Application generator must use the same rule.
- A Team workload Application's own chart revision and the Team GitOps Application's `HEAD` are not qualified. The first is user input and may be a chart version.

### Switch

A boolean under the ArgoCD app settings, on by default, removes the annotation from all generated Applications. It does not affect fully qualified references. It is a temporary safeguard and is to be removed once the regression below is fixed in the ArgoCD version APL ships.

### Accepted risks

- **Open ArgoCD regression (argoproj/argo-cd#27875).** With the annotation set, a commit that touches an Application's paths while it is still syncing the previous commit is reported to be applied as a partial self-heal sync that skips sync hooks and writes no history entry. Every generated Application has self-heal enabled, so none gets stuck. The code the issue blames is present in ArgoCD v3.6.2; the hook-skipping was reported on v3.4.3 and was not reproduced on v3.6.2 before this decision. The likeliest trigger on APL is an image updater commit landing while a Team workload Application runs a chart's pre-upgrade hook.
- **Workload charts must be self-contained.** A Team workload Application re-renders only when its own chart path or its own values files change. A chart that reads files elsewhere in the team's repository will not pick up changes to them until something under its own path changes or a hard refresh is done. This is documented on the workload path setting.

## Considered Options

- **Leave Team workload Applications un-annotated.** Rejected. The multi-source defect that made the annotation ineffective for them (argoproj/argo-cd#25529) is fixed in ArgoCD v3.6.2, and they are the largest group sourced from the values repo.
- **Reproduce the regression on a development cluster before annotating Team workload Applications.** Rejected in favour of shipping with the switch as the remedy.
- **No switch; fix by patch release if needed.** Rejected. The generators re-apply the annotation on every apply, so a platform admin would have no remedy of their own.
- **A per-workload opt-out.** Rejected as more surface than the risk warrants.
- **An explicit setting stating whether the platform revision is a tag, a branch or a commit.** Rejected. The release-version shape covers every released platform and cannot break development builds.

## Consequences

- No migration is needed. The apl-operator and the team namespace chart regenerate every Application on each apply.
- Respelling a branch as a fully qualified reference resolves to the same commit and renders the same manifests, and ArgoCD only auto-syncs an Application that is out of sync, so the upgrade is not expected to trigger syncs.
- Any new Application generator must set the annotation with a value that covers every source the Application reads, and honour the switch.
- Any change to how the platform revision is spelled must be made in the shared rule, or the self-update check will pause every apply.
