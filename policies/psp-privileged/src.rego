# METADATA
# title: Containers must not run as privileged
# description: |-
#   Privileged containers can easily escalate to root privileges on the node. As
#   such containers running as privileged or with sufficient capabilities granted
#   to obtain the same effect are not allowed.
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
package pspprivileged

import data.lib.core
import data.lib.exceptions
import data.lib.parameters
import data.lib.pods
import data.lib.security

policyID = "psp-privileged"

violation[{"msg": msg}] {
	not exceptions.is_exception(policyID)
	pods.containers[container]
	not exceptions.is_container_exception(container.name, policyID)
	container_is_privileged(container)
	msg := sprintf("Policy: %s - Privileged container is not allowed: %s/%s, securityContext: %v", [policyID, core.kind, core.name, container.securityContext])
}

container_is_privileged(container) {
	container.securityContext.privileged
}

container_is_privileged(container) {
	security.added_capability(container, "CAP_SYS_ADMIN")
}

container_is_privileged(container) {
	container.securityContext.allowPrivilegeEscalation
}
