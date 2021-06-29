# @title Containers
#
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package bannedimagetags

import data.lib.core
import data.lib.exceptions
import data.lib.parameters
import data.lib.pods

policyID = "banned-image-tags"

violation[{"msg": msg}] {
	not exceptions.is_exception(policyID)
	pods.containers[container]
	trace(sprintf("container: %v", [container]))
	not exceptions.is_container_exception(container.name, policyID)
	tag := [contains(container.image, ":")]
	not all(tag)
	msg := sprintf("Policy: %s - container <%v> didn't specify an image tag <%v>", [policyID, container.name, container.image])
}

violation[{"msg": msg}] {
	not exceptions.is_exception(policyID)
	pods.containers[container]
	trace(sprintf("container: %v", [container]))
	not exceptions.is_container_exception(container.name, policyID)
	img_split := split(container.image, ":")
	tag := img_split[minus(count(img_split), 1)]
	trace(sprintf("tag: %v", [tag]))
	banned := {s | s = parameters.policy_parameters(policyID).tags[_]}
	trace(sprintf("banned: %v", [banned]))
	banned[tag]
	msg := sprintf("Policy: %s - container <%v> has banned image tag <%v>, banned tags are %v", [policyID, container.name, tag, banned])
}
