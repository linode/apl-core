# @title Containers must not allow added capabilities
#
# Privileged containers can easily escalate to root privileges on the node. 
# As such containers with sufficient capabilities granted to obtain escalated access are not allowed.
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package bannedimagetags

import data.parameters

policyID = "banned-image-tags"

disallowed_tags := ["badtag", "badtag2"]

parameters_disabled := {policyID: {"enabled": false, "tags": disallowed_tags}}

parameters_enabled := {policyID: {"enabled": true, "tags": disallowed_tags}}

pod_allowed := {
	"kind": "Pod",
	"metadata": {"name": "allowed"},
	"spec": {"containers": [{"name": "allowed", "image": "bla:oktag"}]},
}

pod_disallowed := {
	"kind": "Pod",
	"metadata": {"name": "disallowed"},
	"spec": {"containers": [{"name": "disallowed", "image": "bla:badtag"}]},
}

test_disabled {
	ret := violation with input as pod_allowed
		 with data.parameters as parameters_disabled

	count(ret) == 0
}

test_pod_allowed {
	ret := violation with input as pod_allowed
		 with data.parameters as parameters_enabled

	count(ret) == 0
}

test_pod_disallowed {
	ret := violation with input as pod_disallowed
		 with data.parameters as parameters_enabled

	count(ret) == 1
}
