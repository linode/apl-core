package lib.parameters
# Using  wrapper logic to obtain extra parameters from annotations 
# Match by policyID and merge default parameters passed as data object with extra parameters from annotations
# 
# import data.lib.parameters
# policyID = ...
# 
# parameters = parameters.parameters(policyID)
# 

import data.lib.core
import data.lib.pods
import data.lib.annotations

parameters(policyID) = params {
  params := object.union(core.parameters[policyID], extra_parameters(policyID))
}

extra_parameters(policyID) = params {
  meta_annotations := annotations.policy_annotations()
  policyAnnotationField := sprintf("%s.%s", [annotations.paramsAnnotationField, policyID])
  core.has_field(meta_annotations, policyAnnotationField)
  params := json.unmarshal(meta_annotations[policyAnnotationField])
} else = params {
  params := {}
}
