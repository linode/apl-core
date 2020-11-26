package lib.parameters
# Using  wrapper logic to obtain extra parameters from annotations 
# Usage:
# 
# import data.lib.parameters
# policyID = ...
# 
# parameters = parameters.parameters(policyID)
# 

import data.lib.core
import data.lib.pods

default paramsAnnotationField = "policies.otomi.io/parameters"

resource_annotations = annotations {
  annotations := object.union(core.annotations, pods.pod.metadata.annotations)
}

extra_parameters(policyID) = params {
  annotations := resource_annotations()
  policyAnnotationField := sprintf("%s.%s", [paramsAnnotationField, policyID])
  core.has_field(annotations, policyAnnotationField)
  params := json.unmarshal(annotations[policyAnnotationField])
} else = params {
  params := {}
}

parameters(policyID) = params {
  params := object.union(core.parameters[policyID], extra_parameters(policyID))
}

