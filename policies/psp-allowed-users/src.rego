# @title Containers must include allowed securityContext
#
# Granting containers a securityContext object outisde of the defined
# parameters is not allowed
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package pspallowedusers
import data.lib.core
import data.lib.pods
import data.lib.exceptions

policyID = "pspallowedusers"


violation[{"msg": msg}] {
  exceptions.parameters(policyID).enabled
  not exceptions.is_exception(policyID)
  rule := exceptions.parameters(policyID).runAsUser.rule
  input_containers[input_container]
  provided_user := run_as_user(input_container.securityContext, core.review)
  not accept_users(rule, provided_user)
  msg := sprintf("Policy: %s - container %v is attempting to run as disallowed user %v", [policyID, input_container.name, provided_user])
}
violation[{"msg": msg}] {
  exceptions.parameters(policyID).enabled
  not exceptions.is_exception(policyID)
  rule := exceptions.parameters(policyID).runAsUser.rule
  input_containers[input_container]
  not run_as_user(input_container.securityContext, core.review)
  rule != "RunAsAny"
  msg := sprintf("Policy: %s - container %v is attempting to run without a required securityContext/runAsUser",  [policyID, input_container.name])
}
accept_users("RunAsAny", provided_user) {true}
accept_users("MustRunAsNonRoot", provided_user) = res {res := provided_user != 0}
accept_users("MustRunAs", provided_user) = res  {
  ranges := exceptions.parameters(policyID).runAsUser.ranges
  matching := {1 | provided_user >= ranges[j].min; provided_user <= ranges[j].max}
  res := count(matching) > 0
}
input_containers[c] {
  c := pods.containers[container]
}
run_as_user(container_security_context, review) = run_as_user {
  run_as_user := container_security_context.runAsUser
}
run_as_user(container_security_context, review) = run_as_user {
  not container_security_context.runAsUser
  run_as_user := review.object.spec.securityContext.runAsUser
}

