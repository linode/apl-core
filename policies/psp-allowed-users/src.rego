# @title Containers must run with allowed user and group ranges
#
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package pspallowedusers
import data.lib.core
import data.lib.pods
import data.lib.exceptions
import data.lib.parameters

policyID = "pspallowedusers"

violation[{"msg": msg}] {
  not exceptions.is_exception(policyID)
  fields := ["runAsUser", "runAsGroup", "supplementalGroups", "fsGroup"]
  field := fields[_]
  pods.containers[container]
  msg := get_type_violation(field, container)
}
get_type_violation(field, container) = msg {
  field == "runAsUser"
  params := parameters.parameters(policyID)
  msg := get_user_violation(params[field], container)
}
get_type_violation(field, container) = msg {
  field != "runAsUser"
  params := parameters.parameters(policyID)
  msg := get_violation(field, params[field], container)
}
# RunAsUser (separate due to "MustRunAsNonRoot")
get_user_violation(params, container) = msg {
  rule := params.rule
  provided_user := get_field_value("runAsUser", container, pods.pod)
  not accept_users(rule, provided_user)
  msg := sprintf("Policy: %s - Container %v is attempting to run as disallowed user %v. Allowed runAsUser: %v", [policyID, container.name, provided_user, params])
}
get_user_violation(params, container) = msg {
  not get_field_value("runAsUser", container, pods.pod)
  params.rule != "RunAsAny"
  msg := sprintf("Policy: %s - Container %v is attempting to run without a required securityContext/runAsUser. Allowed runAsUser: %v", [policyID, container.name, params])
}
accept_users("RunAsAny", provided_user) {true}
accept_users("MustRunAsNonRoot", provided_user) = res {res := provided_user != 0}
accept_users("MustRunAs", provided_user) = res  {
  ranges := parameters.parameters(policyID).runAsUser.ranges
  res := is_in_range(provided_user, ranges)
}

# Group Options
get_violation(field, params, container) = msg {
  rule := params.rule
  provided_value := get_field_value(field, container, pods.pod)
  not is_array(provided_value)
  not accept_value(rule, provided_value, params.ranges)
  msg := sprintf("Policy: %s - Container %v is attempting to run as disallowed group %v. Allowed %v: %v", [policyID, container.name, provided_value, field, params])
}
# SupplementalGroups is array value
get_violation(field, params, container) = msg {
  rule := params.rule
  array_value := get_field_value(field, container, pods.pod)
  is_array(array_value)
  provided_value := array_value[_]
  not accept_value(rule, provided_value, params.ranges)
  msg := sprintf("Policy: %s - Container %v is attempting to run with disallowed supplementalGroups %v. Allowed %v: %v", [policyID, container.name, array_value, field, params])
}
get_violation(field, params, container) = msg {
  not get_field_value(field, container, pods.pod)
  params.rule == "MustRunAs"
  msg := sprintf("Policy: %s - Container %v is attempting to run without a required securityContext/%v. Allowed %v: %v", [policyID, container.name, field, field, params])
}
accept_value("RunAsAny", provided_value, ranges) {true}
accept_value("MayRunAs", provided_value, ranges) = res { res := is_in_range(provided_value, ranges)}
accept_value("MustRunAs", provided_value, ranges) = res { res := is_in_range(provided_value, ranges)}
# If container level is provided, that takes precedence
get_field_value(field, container, review) = out {
  container_value := get_seccontext_field(field, container)
  out := container_value
}
# If no container level exists, use pod level
get_field_value(field, container, review) = out {
  not get_seccontext_field(field, container)
  pod_value := get_seccontext_field(field, review.spec)
  out := pod_value
}
# Helper Functions
is_in_range(val, ranges) = res {
  matching := {1 | val >= ranges[j].min; val <= ranges[j].max}
  res := count(matching) > 0
}
get_seccontext_field(field, obj) = out {
  out = obj.securityContext[field]
}
