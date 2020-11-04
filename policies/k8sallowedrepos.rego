package k8sallowedrepos
import data.lib.core

violation[{"msg": msg}] {
  container := core.resource.spec.containers[_]
  satisfied := [good | repo = core.parameters.repos[_] ; good = startswith(container.image, repo)]
  not any(satisfied)
  msg := sprintf("container <%v> has an invalid image repo <%v>, allowed repos are %v", [container.name, container.image, core.parameters.repos])
}

violation[{"msg": msg}] {
  container := core.resource.spec.initContainers[_]
  satisfied := [good | repo = core.parameters.repos[_] ; good = startswith(container.image, repo)]
  not any(satisfied)
  msg := sprintf("container <%v> has an invalid image repo <%v>, allowed repos are %v", [container.name, container.image, core.parameters.repos])
}

# enable deployments sts 
violation[{"msg": msg}] {
  container := core.resource.spec.template.spec.containers[_]
  satisfied := [good | repo = core.parameters.repos[_] ; good = startswith(container.image, repo)]
  not any(satisfied)
  msg := sprintf("container <%v> has an invalid image repo <%v>, allowed repos are %v", [container.name, container.image, core.parameters.repos])
}

violation[{"msg": msg}] {
  container := core.resource.spec.template.spec.initContainers[_]
  satisfied := [good | repo = core.parameters.repos[_] ; good = startswith(container.image, repo)]
  not any(satisfied)
  msg := sprintf("container <%v> has an invalid image repo <%v>, allowed repos are %v", [container.name, container.image, core.parameters.repos])
}

