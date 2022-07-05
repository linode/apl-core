# METADATA
# title: Containers must run with allowed user and group ranges
# custom:
#   matchers:
#     kinds:
#     - apiGroups:
#       - ""
#       kinds:
#       - Pod
#     - apiGroups:
#       - apps
#       kinds:
#       - DaemonSet
#       - Deployment
#       - StatefulSet
#     - apiGroups:
#       - batch
#       kinds:
#       - CronJob
#       - Job
#     - apiGroups:
#       - serving.knative.dev
#       kinds:
#       - Service
package pspallowedusers

import data.lib.core
import data.lib.exceptions
import data.lib.parameters
import data.lib.pods

policyID = "psp-allowed-users"

violation[{"msg": msg}] {
	not exceptions.is_exception(policyID)
	fields := ["runAsUser", "runAsGroup", "supplementalGroups", "fsGroup"]
	field := fields[_]
	pods.containers[container]
	not exceptions.is_container_exception(container.name, policyID)
	msg := get_type_violation(field, container)
}

get_type_violation(field, container) = msg {
	field == "runAsUser"
	params := parameters.policy_parameters(policyID)
	msg := get_user_violation(params[field], container)
}

get_type_violation(field, container) = msg {
	field != "runAsUser"
	params := parameters.policy_parameters(policyID)
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
	params.rule = "MustRunAs"
	msg := sprintf("Policy: %s - Container %v is attempting to run without a required securityContext/runAsUser", [policyID, container.name])
}

get_user_violation(params, container) = msg {
	params.rule = "MustRunAsNonRoot"
	not get_field_value("runAsUser", container, pods.pod)
	not get_field_value("runAsNonRoot", container, pods.pod)
	msg := sprintf("Policy: %s - Container %v is attempting to run without a required securityContext/runAsNonRoot or securityContext/runAsUser != 0", [policyID, container.name])
}

accept_users("RunAsAny", provided_user) = true

accept_users("MustRunAsNonRoot", provided_user) = res {
	res := provided_user != 0
}

accept_users("MustRunAs", provided_user) = res {
	ranges := parameters.policy_parameters(policyID).runAsUser.ranges
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

accept_value("RunAsAny", provided_value, ranges) = true

accept_value("MayRunAs", provided_value, ranges) = res {
	res := is_in_range(provided_value, ranges)
}

accept_value("MustRunAs", provided_value, ranges) = res {
	res := is_in_range(provided_value, ranges)
}

# If container level is provided, that takes precedence
get_field_value(field, container, obj) = out {
	container_value := get_seccontext_field(field, container)
	out := container_value
}

# If no container level exists, use pod level
get_field_value(field, container, obj) = out {
	not has_seccontext_field(field, container)
	pod_value := get_seccontext_field(field, obj.spec)
	out := pod_value
}

# Helper Functions
is_in_range(val, ranges) = res {
	matching := {1 | val >= ranges[j].min; val <= ranges[j].max}
	res := count(matching) > 0
}

has_seccontext_field(field, obj) {
	get_seccontext_field(field, obj)
}

has_seccontext_field(field, obj) {
	get_seccontext_field(field, obj) == false
}

get_seccontext_field(field, obj) = out {
	out = obj.securityContext[field]
}
