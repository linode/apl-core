package pspprivileged
import data.lib.core
import data.lib.pods

policyID = "pspprivileged"

violation[{"msg": msg, "details": {}}] {
  core.paramaeters.pspprivileged.enabled
  core.pods.containers[container]
  container.securityContext.privileged
  msg := sprintf("Policy %s - Privileged container is not allowed: %v, securityContext: %v", [policyID, container.name, container.securityContext])
}


