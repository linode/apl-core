package k8sbannedimagetags
import data.lib.helpers
import data.lib.helpers.object
import data.lib.helpers.parameters

violation[{"msg": msg}] {
  container := object.spec.containers[_]
  img_split := split(container.image, ":")
  tag := img_split[count(img_split) - 1]
  banned := {s | s = parameters.tags[_]}
  banned[tag]
  msg := sprintf("container <%v> has banned image tag <%v>, banned tags are %v", [container.name, tag, banned])
}

