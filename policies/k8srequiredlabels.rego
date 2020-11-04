package k8srequiredlabels
import data.lib.core

violation[{"msg": msg, "details": {"missing_labels": missing}}] {
  provided := {label | core.resource.metadata.labels[label]}
  required := {label | label := core.parameters.labels[_]}
  missing := required - provided
  count(missing) > 0
  msg := sprintf("you must provide labels: %v", [missing])
}

