# @title Containers must not allow added capabilities
#
# Privileged containers can easily escalate to root privileges on the node. 
# As such containers with sufficient capabilities granted to obtain escalated access are not allowed.
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package lib.exceptions

import data.lib.annotations

policyID = "exceptions"

container = "exceptions"

annotations_pod_exception := {annotations.ignoreAnnotationField: policyID}

annotations_container_exception_key := sprintf(annotations.containerIgnoreAnnotationField, [container])

annotations_container_exception := {annotations_container_exception_key: policyID}

pod_allowed := {
	"kind": "Pod",
	"metadata": {"name": "allowed"},
	"spec": {"containers": [{"name": "allowed"}]},
}

pod_exception := {
	"kind": "Pod",
	"metadata": {"name": "podexception", "annotations": annotations_pod_exception},
	"spec": {"containers": [{"name": container}]},
}

container_exception := {
	"kind": "Pod",
	"metadata": {"name": "containerexception", "annotations": annotations_container_exception},
	"spec": {"containers": [{"name": container}]},
}

test_no_exception {
	not is_exception(policyID) with input as pod_allowed
		 with policyID as policyID
}

test_pod_exception {
	is_exception(policyID) with input as pod_exception
}

test_container_exception {
	is_container_exception(container, policyID) with input as container_exception
}
