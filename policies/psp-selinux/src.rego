# @title Containers must not other allow Selinux profiles
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package pspselinux
import data.lib.core
import data.lib.pods
import data.lib.exceptions
import data.lib.parameters

policyID = "psp-selinux"

# Disallow top level custom SELinux options
violation[{"msg": msg, "details": {}}] {
  not exceptions.is_exception(policyID)
  ctx := pods.pod.spec.securityContext
  accept_context(parameters.parameters(policyID).seLinuxContext, ctx)
  msg := sprintf("SELinux options is not allowed, pod: %v. Allowed options: %v", [core.resource.metadata.name, parameters.parameters(policyID).allowedSELinuxOptions])
}
# Disallow container level custom SELinux options
violation[{"msg": msg, "details": {}}] {
  c := input_security_context[_]
  accept_context(parameters.parameters(policyID).seLinuxContext, c.securityContext)
  msg := sprintf("SELinux options is not allowed, pod: %v, container %v. Allowed options: %v", [core.resource.metadata.name, c.name, parameters.parameters(policyID).allowedSELinuxOptions])
}
input_seLinuxOptions_allowed(options) = true {
  params := parameters.parameters(policyID).allowedSELinuxOptions[_]
  field_allowed("level", options, params)
  field_allowed("role", options, params)
  field_allowed("type", options, params)
  field_allowed("user", options, params)
}
field_allowed(field, options, params) = true {
  params[field] == options[field]
}
# not working after context check
# field_allowed(field, options, params) {
#   not has_field(options, field)
# }
input_security_context[container] {
  pods.containers[container]
  has_field(container.securityContext, "seLinuxOptions")
}
# has_field returns whether an object has a field
has_field(object, field) = true {
  object[field]
}

accept_context(rule, context) = false {
  rule == "RunAsAny"
}

accept_context(rule, context) = true {
  rule == "MustRunAs"
  has_field(context, "seLinuxOptions")
  not input_seLinuxOptions_allowed(context.seLinuxOptions)
}
