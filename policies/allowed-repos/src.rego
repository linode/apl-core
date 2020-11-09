# @title Images must come from allowed repositories only
#
# We can have a list of allowed sources and deny 
# all containers that do not come from a trusted repository source
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package allowedrepos

import data.lib.core
import data.lib.pods

policyID = "allowedrepos"

violation[{"msg": msg}] {
  core.parameters.allowedrepos.enabled
  pods.containers[container]
  satisfied := [good | repo = core.parameters.allowedrepos.repos[_] ; good = startswith(container.image, repo)]
  not any(satisfied)
  msg := sprintf("Policy %s: - container <%v> has an invalid image repo <%v>, allowed repos are %v", [policyID, container.name, container.image, core.parameters.allowedrepos.repos])
}
