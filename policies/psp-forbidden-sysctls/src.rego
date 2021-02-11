# @title Containers must not allow sysctls
#
# Deny using sysctls
#
# Sysctls can disable security mechanisms or affect all containers on a host, 
# and should be disallowed except for an allowed "safe" subset.
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package pspforbiddensysctls

import data.lib.core
import data.lib.exceptions
import data.lib.parameters
import data.lib.pods
import data.lib.security

policyID = "psp-forbidden-sysctls"

violation[{"msg": msg, "details": {}}] {
	not exceptions.is_exception(policyID)
	sysctl := core.resource.securityContext.sysctls[_].name
	forbidden_sysctl(sysctl)
	msg := sprintf("Policy: %s - The sysctl %v is not allowed, pod: %v. Forbidden sysctls: %v", [policyID, sysctl, core.resource.metadata.name, parameters.policy_parameters(policyID).forbiddenSysctls])
}

# * may be used to forbid all sysctls
forbidden_sysctl(sysctl) {
	parameters.policy_parameters(policyID).forbiddenSysctls[_] == "*"
}

forbidden_sysctl(sysctl) {
	parameters.policy_parameters(policyID).forbiddenSysctls[_] == sysctl
}

forbidden_sysctl(sysctl) {
	startswith(sysctl, trim(parameters.policy_parameters(policyID).forbiddenSysctls[_], "*"))
}
