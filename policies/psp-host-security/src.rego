# @title Pods must not run with access to the host 
#
# Pods that can access the host's process tree can view and attempt to
# modify processes outside of their namespace, breaking that security
# boundary.
#
# Pods that are allowed to access the host IPC can read memory of
# the other containers, breaking that security boundary.
#
# Pods that can change aliases in the host's /etc/hosts file can
# redirect traffic to malicious servers.
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod batch/CronJob batch/Job serving.knative.dev/Service
package psphostsecurity

import data.lib.core
import data.lib.exceptions
import data.lib.parameters
import data.lib.pods

policyID := "psp-host-security"

violation[{"msg": msg}] {
	not exceptions.is_exception(policyID)
	pod_has_hostpid
	msg := sprintf("Policy: %s - %s/%s: Pod allows for accessing the host PID namespace", [policyID, core.kind, core.name])
}

violation[{"msg": msg}] {
	not exceptions.is_exception(policyID)
	pod_has_hostipc
	msg := sprintf("Policy: %s - %s/%s: Pod allows for accessing the host IPC", [policyID, core.kind, core.name])
}

violation[{"msg": msg}] {
	not exceptions.is_exception(policyID)
	pod_host_alias
	msg := sprintf("Policy: %s - %s/%s: Pod has hostAliases defined", [policyID, core.kind, core.name])
}

pod_has_hostpid {
	pods.pod.spec.hostPID
}

pod_has_hostipc {
	pods.pod.spec.hostIPC
}

pod_host_alias {
	pods.pod.spec.hostAliases
}
