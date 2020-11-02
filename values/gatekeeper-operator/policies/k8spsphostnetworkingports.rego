package k8spsphostnetworkingports
import data.lib.helpers
import data.lib.helpers.object
import data.lib.helpers.parameters

violation[{"msg": msg, "details": {}}] {
  input_share_hostnetwork(object)
  msg := sprintf("The specified hostNetwork and hostPort are not allowed, pod: %v. Allowed values: %v", [object.metadata.name, parameters])
}
input_share_hostnetwork(o) {
  not parameters.hostNetwork
  o.spec.hostNetwork
}
input_share_hostnetwork(o) {
  hostPort := input_containers[_].ports[_].hostPort
  hostPort < parameters.min
}
input_share_hostnetwork(o) {
  hostPort := input_containers[_].ports[_].hostPort
  hostPort > parameters.max
}
input_containers[c] {
  c := object.spec.containers[_]
}
input_containers[c] {
  c := object.spec.initContainers[_]
}

