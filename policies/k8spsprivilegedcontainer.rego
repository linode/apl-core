package k8spspprivileged
import data.lib.core

violation[{"msg": msg, "details": {}}] {
    c := input_containers[_]
    c.securityContext.privileged
    msg := sprintf("Privileged container is not allowed: %v, securityContext: %v", [c.name, c.securityContext])
}

input_containers[c] {
    c := core.resource.spec.containers[_]
}

input_containers[c] {
    c := core.resource.spec.initContainers[_]
}

# enable deploys sts
# input_containers[c] {
#     c := object.spec.template.spec.containers[_]
# }

# input_containers[c] {
#     c := object.spec.template.spec.initContainers[_]
# }

