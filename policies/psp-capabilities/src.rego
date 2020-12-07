# @title Containers must not allow added capabilities
#
# Privileged containers can easily escalate to root privileges on the node. 
# As such containers with sufficient capabilities granted to obtain escalated access are not allowed.
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package pspcapabilities
import data.lib.core
import data.lib.pods
import data.lib.security
import data.lib.exceptions
import data.lib.parameters

policyID = "psp-capabilities"

violation[{"msg": msg}] {
  not exceptions.is_exception(policyID)
  pods.containers[container]
  has_disallowed_capabilities(container)
  msg := sprintf("Policy: %s - Container <%s> in %s/%s has a disallowed capabilities [%v].", [policyID, container.name, core.kind, core.name, container.securityContext.capabilities.add])
}

has_disallowed_capabilities(container) {
  allowed := {c | c := parameters.parameters(policyID).allowedCapabilities[_]}
  not allowed["*"]
  capabilities := {c | c := container.securityContext.capabilities.add[_]}
  count(capabilities - allowed) > 0
}

get_default(obj, param, _default) = out {
  out = obj[param]
}
get_default(obj, param, _default) = out {
  not obj[param]
  not obj[param] == false
  out = _default
}

#/* Disabled as it does not fit well with community based charts and platforms */#
# violation[{"msg": msg}] {
#   deny_drop_caps[msg]
# }

# deny_drop_caps[msg] {
#   not exceptions.is_exception(policyID)
#   pods.containers[container]
#   missing_drop_capabilities(container)
#   msg := sprintf("container <%v> is not dropping all required capabilities. Container must drop all of %v", [container.name, parameters.parameters(policyID).requiredDropCapabilities])
# }

# # only check if dropped caps array exists
# is_dropping_capabilities(container) = true {
#   count(container.securityContext.capabilities.drop) > 0
# }

# missing_drop_capabilities(container) {
#   is_dropping_capabilities(container)
#   must_drop := {c | c := parameters.parameters(policyID).requiredDropCapabilities[_]}
#   dropped := {c | c := container.securityContext.capabilities.drop[_]}
#   not count({x | dropped[x]; required = must_drop[_]; x == required}) > 0
# }
