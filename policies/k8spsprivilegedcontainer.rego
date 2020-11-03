package k8spspprivileged
import data.lib.helpers
import data.lib.helpers.object

violation[{"msg": msg, "details": {}}] {
    c := input_containers[_]
    c.securityContext.privileged
    msg := sprintf("Privileged container is not allowed: %v, securityContext: %v", [c.name, c.securityContext])
}

input_containers[c] {
    c := object.spec.containers[_]
}

input_containers[c] {
    c := object.spec.initContainers[_]
}

