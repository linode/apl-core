package otomi

has_qos_guaranteed_resources(containers) {
  containers[_].resources.limits.cpu == containers[_].resources.requests.cpu
  containers[_].resources.limits.memory == containers[_].resources.requests.memory
}

deny[msg] {
  input.kind == "Deployment"
  containers := input.spec.template.spec.containers
  not has_qos_guaranteed_resources(containers)
  msg := "Containers must provide guaranteed qos resource limits and requests"
}

deny[msg] {
  input.kind == "StatefulSet"
  containers := input.spec.template.spec.containers
  not has_qos_guaranteed_resources(containers)
  msg := "Containers must provide guaranteed qos resource limits and requests"
}
