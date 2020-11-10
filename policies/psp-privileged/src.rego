# @title Containers must not run as privileged
#
# Privileged containers can easily escalate to root privileges on the node. As
# such containers running as privileged or with sufficient capabilities granted
# to obtain the same effect are not allowed.
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package pspprivileged
import data.lib.core
import data.lib.pods
import data.lib.security

policyID = "pspprivileged"

violation[msg] {
  core.parameters.pspprivileged.enabled
  pods.containers[container]
  container_is_privileged(container)
  msg := sprintf("Policy: %s - Privileged container is not allowed: %s/%s, securityContext: %v", [policyID, core.kind, core.name, container.securityContext])
}

container_is_privileged(container) {
    container.securityContext.privileged
}

container_is_privileged(container) {
    security.added_capability(container, "CAP_SYS_ADMIN")
}
