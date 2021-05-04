package lib.psps

import data.lib.core

# PodSecurityPolicies are not namespace scoped, so the default PSPs included
# in managed Kubernetes offerings cannot be excluded using the normal
# methods in Gatekeeper.
is_exception {
    exceptions := {
        "gce.privileged",               # GKE
        "gce.persistent-volume-binder", # GKE
        "gce.event-exporter",           # GKE
        "gce.gke-metrics-agent",        # GKE
        "gce.unprivileged-addon",       # GKE
        "gce.fluentd-gke",              # GKE
        "gce.fluentd-gcp"               # GKE
    }
    core.name == exceptions[_]
}

psps[psp] {
    lower(core.kind) = "podsecuritypolicy"
    not is_exception
    psp := core.resource
}
