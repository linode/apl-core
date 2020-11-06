package k8srequiredlabels
import data.lib.core
import data.lib.pods

policyID = "requiredlabels"

violation[{"msg": msg, "details": {"missing_labels": missing}}] {
  provided := {label | core.resource.metadata.labels[label]}
  required := {label | label := core.parameters.labels[_]}
  missing := required - provided
  count(missing) > 0
  msg := sprintf("Policy: %s - Resource <%v/%v> you must provide labels: %v", [policyID, core.resource.kind, core.resource.metadata.name, missing])
}

