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

parameters_disabled := {"psp-capabilities": {"enabled": false, "disAllowedCapabilities": allowed_caps}}

parameters_allowed := {"psp-capabilities": {"enabled": true, "allowedCapabilities": allowed_caps}}

parameters_disallowed := {"psp-capabilities": {"enabled": true, "disAllowedCapabilities": disallowed_caps}}

sec_allowed := {"capabilities": {"add": allowed_caps}}

sec_disallowed := {"capabilities": {"add": disallowed_caps}}

pod_allowed := {
	"kind": "Pod",
	"metadata": {"name": "allowed", "annotations": {}},
	"spec": {"containers": [{"name": "nosec"}], "securityContext": {"capabilities": {"add": allowed_caps}}},
}

container_allowed := {
	"kind": "Pod",
	"metadata": {"name": "nosec", "annotations": {}},
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

disallowed_pod_msg := sprintf("Policy: %s - %s[%s] has disallowed capabilities %v.", [policyID, pod_disallowed.kind, pod_disallowed.metadata.name, disallowed_caps])

# disallowed_container_msg := sprintf("Policy: %s - %s[%s].containers[%s] has disallowed capabilities %v.", [policyID, pod_disallowed.kind, pod_disallowed.metadata.name, container_allowed.spec.containers[0].name, disallowed_caps])

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

	count(ret) > 0
}

test_container_disallowed {
	ret := violation with input as container_disallowed
		 with data.parameters as parameters_allowed

	count(ret) > 0
}
