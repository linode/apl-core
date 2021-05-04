# @title Containers must not allow added capabilities
#
# Privileged containers can easily escalate to root privileges on the node. 
# As such containers with sufficient capabilities granted to obtain escalated access are not allowed.
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package pspcapabilities

import data.lib.core
import data.lib.exceptions
import data.lib.parameters
import data.lib.pods
import data.lib.security

policyID = "psp-capabilities"

has_given(needs, given) {
	intsect := needs & given
	count(intsect) == count(given)
}

get_default(obj, param, _default) = out {
	out = obj[param]
}

get_default(obj, param, _default) = out {
	not obj[param]
	not obj[param] == false
	out = _default
}

# check pod caps allowed
violation[{"msg": msg}] {
	base_msg := sprintf("checking pod[%s] violation:", [pods.pod.metadata.name])
	trace("checking pod violation")
	not exceptions.is_exception(policyID)
	has_disallowed_capabilities(pods.pod.spec)
	allowed := {c | c := parameters.policy_parameters(policyID).allowedCapabilities}
	msg := sprintf("Policy: %s - %s[%s] has disallowed capabilities %v (allowed: %v).", [policyID, core.kind, core.name, pods.pod.spec.securityContext.capabilities.add, allowed])
}

# check container caps allowed
violation[{"msg": msg}] {
	not exceptions.is_exception(policyID)
	pods.containers[container]
	not exceptions.is_container_exception(container.name, policyID)
	has_disallowed_capabilities(container)
	allowed := {c | c := parameters.policy_parameters(policyID).allowedCapabilities}
	msg := sprintf("Policy: %s - %s[%s].containers[%s] has disallowed capabilities %v (allowed: %v).", [policyID, core.kind, core.name, container.name, container.securityContext.capabilities.add, allowed])
}

has_disallowed_capabilities(obj) {
	allowed := {c | c := parameters.policy_parameters(policyID).allowedCapabilities[_]}
	trace(sprintf("allowed: %v", [allowed]))
	not allowed["*"]

	trace(sprintf("obj: %v", [obj]))
	capabilities := {c | c := obj.securityContext.capabilities.add[_]}
	not has_given(allowed, capabilities)
}

# check drop caps pod
violation[{"msg": msg}] {
	not exceptions.is_exception(policyID)
	missing_drop_capabilities(pods.pod.spec)
	msg := sprintf("Policy %s - %s[%s] is not dropping all required capabilities. It must drop all of %v", [policyID, core.kind, core.name, parameters.policy_parameters(policyID).requiredDropCapabilities])
}

# check drop caps container
violation[{"msg": msg}] {
	not exceptions.is_exception(policyID)
	pods.containers[container]
	not exceptions.is_container_exception(container.name, policyID)
	missing_drop_capabilities(container)
	msg := sprintf("Policy %s - %s[%s].containers[%s] is not dropping all required capabilities. It must drop all of %v", [policyID, core.kind, core.name, container.name, parameters.policy_parameters(policyID).requiredDropCapabilities])
}

# only check if dropped caps array exists
is_dropping_capabilities(container) {
	count(container.securityContext.capabilities.drop) > 0
}

missing_drop_capabilities(container) {
	is_dropping_capabilities(container)
	must_drop := {c | c := parameters.policy_parameters(policyID).requiredDropCapabilities[_]}
	dropped := {c | c := container.securityContext.capabilities.drop[_]}
	not has_given(dropped, must_drop)
}
