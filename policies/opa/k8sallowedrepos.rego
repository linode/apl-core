package k8sallowedrepos

deny[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  satisfied := [good | repo = input.parameters.repos[_] ; good = startswith(container.image, repo)]
  not any(satisfied)
  msg := sprintf("container <%v> has an invalid image repo <%v>, allowed repos are %v", [container.name, container.image, input.parameters.repos])
}

deny[{"msg": msg}] {
  container := input.review.object.spec.initContainers[_]
  satisfied := [good | repo = input.parameters.repos[_] ; good = startswith(container.image, repo)]
  not any(satisfied)
  msg := sprintf("container <%v> has an invalid image repo <%v>, allowed repos are %v", [container.name, container.image, input.parameters.repos])
}


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
