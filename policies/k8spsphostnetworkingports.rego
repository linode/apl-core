package k8spsphostnetworkingports
import data.lib.core

violation[{"msg": msg, "details": {}}] {
  input_share_hostnetwork(core.resource)
  msg := sprintf("The specified hostNetwork and hostPort are not allowed, pod: %v. Allowed values: %v", [core.resource.metadata.name, core.parameters])
}
input_share_hostnetwork(o) {
  not core.parameters.hostNetwork
  o.spec.hostNetwork
}
input_share_hostnetwork(o) {
  hostPort := input_containers[_].ports[_].hostPort
  hostPort < core.parameters.min
}
input_share_hostnetwork(o) {
  hostPort := input_containers[_].ports[_].hostPort
  hostPort > core.parameters.max
}
input_containers[c] {
  c := core.resource.spec.containers[_]
}
input_containers[c] {
  c := core.resource.spec.initContainers[_]
}

