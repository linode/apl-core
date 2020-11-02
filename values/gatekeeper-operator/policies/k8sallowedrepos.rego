package k8sallowedrepos
import data.lib.helpers
import data.lib.helpers.object
import data.lib.helpers.parameters

violation[{"msg": msg}] {
  container := object.spec.containers[_]
  satisfied := [good | repo = parameters.repos[_] ; good = startswith(container.image, repo)]
  not any(satisfied)
  msg := sprintf("container <%v> has an invalid image repo <%v>, allowed repos are %v", [container.name, container.image, parameters.repos])
}

violation[{"msg": msg}] {
  container := object.spec.initContainers[_]
  satisfied := [good | repo = parameters.repos[_] ; good = startswith(container.image, repo)]
  not any(satisfied)
  msg := sprintf("container <%v> has an invalid image repo <%v>, allowed repos are %v", [container.name, container.image, parameters.repos])
}

