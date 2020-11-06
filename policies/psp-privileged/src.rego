package pspprivileged
import data.lib.core
import data.lib.pods

policyID = "pspprivileged"

violation[{"msg": msg, "details": {}}] {
  core.pods.containers[container]
  not core.paramaeters.privilegedContainers.enabled
  container.securityContext.privileged
  msg := sprintf("Policy %s - Privileged container is not allowed: %v, securityContext: %v", [policyID, container.name, container.securityContext])
}


