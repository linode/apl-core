# @title Containers
#
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package psphostnetworkingports
import data.lib.core
import data.lib.pods

policyID = "psphostnetworkingports"


violation[msg] {
  pod_has_hostnetwork
  msg := sprintf("Policy: %s - The specified hostNetwork and hostPort are not allowed, pod: %v. Allowed values: %v", [policyID, core.resource.metadata.name, core.parameters.psphostnetworkingports])
}

pod_has_hostnetwork {
  pods.pod.spec.hostNetwork
}


# violation[{"msg": msg, "details": {}}] {
#   core.parameters.psphostnetworkingports.enabled
#   input_share_hostnetwork
#   msg := sprintf("Policy: %s - The specified hostNetwork and hostPort are not allowed, pod: %v. Allowed values: %v", [policyID, core.resource.metadata.name, core.parameters.psphostnetworkingports])
# }

# input_share_hostnetwork {
#   pod_has_hostnetwork
#   pods.containers[container]
#   hostPort := container.ports[_].hostPort
#   hostPort < core.parameters.psphostnetworkingports.min
# }
# input_share_hostnetwork {
#   pod_has_hostnetwork
#   pods.containers[container]
#   hostPort := container.ports[_].hostPort
#   hostPort > core.parameters.psphostnetworkingports.max
# }

# pod_has_hostnetwork {
#   pods.pod.spec.hostNetwork
# }

