# Node affinity

Maurice:

If `otomi.nodeSelector` (dict of label pairs) is set we force platform workloads onto nodes with the labels given.
We then force deploy gatekeeper as it gives `kind: Assign` resources triggering a mutating webhook, allowing us to inject `nodeAffinity`.
We exclude `team-admin` workloads as that namespace is supposed to only run userland deployments that serve additional platform functionality.
