# @title Containers must not allow added capabilities
#
# Privileged containers can easily escalate to root privileges on the node. 
# As such containers with sufficient capabilities granted to obtain escalated access are not allowed.
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package pspcapabilities

policyID = "psp-capabilities"

allowed_caps := ["ALLOWED", "ALLOWED2"]

disallowed_caps := ["ALLOWED", "DISALLOWED"]

parameters_disabled := {policyID: {"enabled": false, "disAllowedCapabilities": allowed_caps}}

parameters_allowed := {policyID: {"enabled": true, "allowedCapabilities": allowed_caps}}

sec_allowed := {"capabilities": {"add": allowed_caps}}

sec_disallowed := {"capabilities": {"add": disallowed_caps}}

pod_allowed := {
	"kind": "Pod",
	"metadata": {"name": "allowed"},
	"spec": {"containers": [{"name": "nosec"}], "securityContext": {"capabilities": {"add": allowed_caps}}},
}

container_allowed := {
	"kind": "Pod",
	"metadata": {"name": "nosec"},
	"spec": {"containers": [{"name": "allowed", "securityContext": sec_allowed}]},
}

pod_disallowed := {
	"kind": "Pod",
	"metadata": {"name": "disallowed"},
	"spec": {"containers": [{"name": "nosec"}], "securityContext": sec_disallowed},
}

container_disallowed := {
	"kind": "Pod",
	"metadata": {"name": "allowed"},
	"spec": {"containers": [{"name": "disallowed", "securityContext": sec_disallowed}]},
}

test_disabled {
	ret := violation with input as pod_allowed
		 with data.parameters as parameters_disabled

	count(ret) == 0
}

test_pod_allowed {
	ret := violation with input as pod_allowed
		 with data.parameters as parameters_allowed

	count(ret) == 0
}

test_container_allowed {
	ret := violation with input as container_allowed
		 with data.parameters as parameters_allowed

	count(ret) == 0
}

test_pod_disallowed {
	ret := violation with input as pod_disallowed
		 with data.parameters as parameters_allowed

	count(ret) == 1
}

test_container_disallowed {
	ret := violation with input as container_disallowed
		 with data.parameters as parameters_allowed

	count(ret) == 1
}
