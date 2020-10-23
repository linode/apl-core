package k8sbannedimagetags

violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  img_split := split(container.image, ":")
  tag := img_split[count(img_split) - 1]
  banned := {s | s = input.parameters.tags[_]}
  banned[tag]
  msg := sprintf("container <%v> has banned image tag <%v>, banned tags are %v", [container.name, tag, banned])
}
