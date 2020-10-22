package otomi

has_resources(containers) {
  containers[_].resources.limits == containers[_].resources.requests
}

deny[msg] {
  input.kind == "Deployment"
  containers := input.spec.template.spec.containers
  not has_resources(containers)
  msg := "Containers must provide guaranteed qos resource limits and requests"
}
deny[msg] {
  input.kind == "StatefulSet"
  containers := input.spec.template.spec.containers
  not has_resources(containers)
  msg := "Containers must provide guaranteed qos resource limits and requests"
}
