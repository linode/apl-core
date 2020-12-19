# @title Containers
#
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package bannedimagetags
import data.lib.core
import data.lib.pods
import data.lib.exceptions
import data.lib.parameters


policyID = "banned-image-tags"

violation[{"msg": msg}] {
  not exceptions.is_exception(policyID)
  pods.containers[container]
  img_split := split(container.image, ":")
  tag := img_split[count(img_split) - 1]
  banned := {s | s = parameters.parameters(policyID).tags[_]}
  banned[tag]
  msg := sprintf("Policy: %s - container <%v> has banned image tag <%v>, banned tags are %v", [policyID, container.name, tag, banned])
}

