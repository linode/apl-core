# @title Containers must not use disallowed  Seccomp profiles
#
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package pspseccomp

import data.lib.core
import data.lib.exceptions
import data.lib.parameters
import data.lib.pods

policyID = "psp-seccomp"

violation[{"msg": msg, "details": {}}] {
	not exceptions.is_exception(policyID)
	metadata := core.resource.metadata
	not input_wildcard_allowed(metadata)
	pods.containers[container]
	not input_container_allowed(metadata, container)
	msg := sprintf("Seccomp profile is not allowed, pod: %v, container: %v, Allowed profiles: %v", [metadata.name, container.name, parameters.policy_parameters(policyID).allowedProfiles])
}

input_wildcard_allowed(metadata) {
	parameters.policy_parameters(policyID).allowedProfiles[_] == "*"
}

input_container_allowed(metadata, container) {
	not get_container_profile(metadata, container)
	metadata.annotations["seccomp.security.alpha.kubernetes.io/pod"] == parameters.policy_parameters(policyID).allowedProfiles[_]
}

input_container_allowed(metadata, container) {
	profile := get_container_profile(metadata, container)
	profile == parameters.policy_parameters(policyID).allowedProfiles[_]
}

get_container_profile(metadata, container) = profile {
	value := metadata.annotations[key]
	startswith(key, "container.seccomp.security.alpha.kubernetes.io/")
	[prefix, name] := split(key, "/")
	name == container.name
	profile = value
}
