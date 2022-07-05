# METADATA
# title: Images must come from allowed repositories only
# description: |-
#   We can have a list of allowed sources and deny
#   all containers that do not come from a trusted repository source
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
package allowedrepos

import data.lib.core
import data.lib.exceptions
import data.lib.parameters
import data.lib.pods

policyID = "psp-allowed-repos"

violation[{"msg": msg}] {
	not exceptions.is_exception(policyID)
	pods.containers[container]
	not exceptions.is_container_exception(container.name, policyID)
	satisfied := [good | repo = parameters.policy_parameters(policyID).repos[_]; good = startswith(container.image, repo)]
	not any(satisfied)
	msg := sprintf("Policy %s: - container <%v> has an invalid image repo <%v>, allowed repos are %v", [policyID, container.name, container.image, parameters.policy_parameters(policyID).repos])
}
