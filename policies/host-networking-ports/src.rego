package psphostnetworkingports
import data.lib.core
import data.lib.pods

policyID = "psphostnetworkingports"

violation[{"msg": msg, "details": {}}] {
  input_share_hostnetwork(core.resource)
  msg := sprintf("Policy: %s - The specified hostNetwork and hostPort are not allowed, pod: %v. Allowed values: %v", [policyID, core.resource.metadata.name, core.parameters])
}
input_share_hostnetwork(o) {
  not core.parameters.hostNetwork.enabled
  o.spec.hostNetwork
}
input_share_hostnetwork(o) {
  pods.containers[container]
  hostPort := container.ports[_].hostPort
  hostPort < core.parameters.hostNetwork.min
}
input_share_hostnetwork(o) {
  pods.containers[container]
  hostPort := container.ports[_].hostPort
  hostPort > core.parameters.hostNetwork.max
}


