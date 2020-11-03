package k8srequiredlabels
import data.lib.helpers
import data.lib.helpers.object
import data.lib.helpers.parameters

violation[{"msg": msg, "details": {"missing_labels": missing}}] {
  provided := {label | object.metadata.labels[label]}
  required := {label | label := parameters.labels[_]}
  missing := required - provided
  count(missing) > 0
  msg := sprintf("you must provide labels: %v", [missing])
}

