# @title Containers must not allow added capabilities
#
# Privileged containers can easily escalate to root privileges on the node. 
# As such containers with sufficient capabilities granted to obtain escalated access are not allowed.
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package lib.annotations

policyID = "annotations"

container = "annotations"

annotations_pod_ignore := {ignoreAnnotationField: policyID}

annotations_container_ignore_key := sprintf(containerIgnoreAnnotationField, [container])

annotations_container_ignore := {annotations_container_ignore_key: policyID}

pod_empty := {
	"kind": "Pod",
	"metadata": {"name": "allowed"},
	"spec": {"containers": [{"name": "allowed"}]},
}

pod_ignore := {
	"kind": "Pod",
	"metadata": {"name": "podignore", "annotations": annotations_pod_ignore},
	"spec": {"containers": [{"name": container}]},
}

container_ignore := {
	"kind": "Pod",
	"metadata": {"name": "containerignore", "annotations": annotations_container_ignore},
	"spec": {"containers": [{"name": container}]},
}

test_pod_empty {
	ret := merge_annotations() with input as pod_empty
	count(ret) == 0
}

test_pod_ignore {
	ret := merge_annotations() with input as pod_ignore
	count(ret) == 1
	ret == annotations_pod_ignore
}

test_container_ignore {
	ret := merge_annotations() with input as container_ignore
	count(ret) == 1
	ret == annotations_container_ignore
}
