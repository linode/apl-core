# @title hostnetworkingports
#
# Containers must disable hostNetworking and port binding on the host
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod batch/CronJob batch/Job serving.knative.dev/Service
package psphostnetworkingports

import data.lib.core
import data.lib.exceptions
import data.lib.parameters
import data.lib.pods

policyID = "psp-host-networking-ports"

violation[{"msg": msg}] {
	not exceptions.is_exception(policyID)
	pod_has_hostnetwork
	msg := sprintf("Policy: %s - HostNetwork not allowed, pod/%v", [policyID, core.name])
}

pod_has_hostnetwork {
	pods.pod.spec.hostNetwork
}
