# @title Images must come from allowed repositories only
#
# We can have a list of allowed sources and deny 
# all containers that do not come from a trusted repository source
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package allowedrepos

import data.lib.core
import data.lib.pods
import data.lib.exceptions

policyID = "allowedrepos"

violation[{"msg": msg}] {
  parameters := exceptions.parameters(policyID)
  parameters.enabled
  not exceptions.is_exception(policyID)
  pods.containers[container]
  satisfied := [good | repo = parameters.repos[_] ; good = startswith(container.image, repo)]
  not any(satisfied)
  msg := sprintf("Policy %s: - container <%v> has an invalid image repo <%v>, allowed repos are %v", [policyID, container.name, container.image, parameters.repos])
}
