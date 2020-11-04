package k8sbannedimagetags
import data.lib.core

violation[{"msg": msg}] {
  container := core.resource.spec.containers[_]
  img_split := split(container.image, ":")
  tag := img_split[count(img_split) - 1]
  banned := {s | s = core.parameters.tags[_]}
  banned[tag]
  msg := sprintf("container <%v> has banned image tag <%v>, banned tags are %v", [container.name, tag, banned])
}


violation[{"msg": msg}] {
  container := core.resource.spec.template.spec.containers[_]
  img_split := split(container.image, ":")
  tag := img_split[count(img_split) - 1]
  banned := {s | s = core.parameters.tags[_]}
  banned[tag]
  msg := sprintf("container <%v> has banned image tag <%v>, banned tags are %v", [container.name, tag, banned])
}

