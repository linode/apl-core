package lib.parameters
# Using  wrapper logic to obtain extra parameters from annotations 
# Usage:
# 
# import data.lib.parameters
# policyID = ...
# 
# parameters = parameters(policyID)
# 

import data.lib.core

default paramsAnnotationField = "policies.otomi.io/parameters"

extra_parameters(policyID) = params {
  core.annotations != null
  policyAnnotationField := sprintf("%s.%s",[paramsAnnotationField, policyID])
  core.has_field(core.annotations, policyAnnotationField)
  params := json.unmarshal(core.annotations[policyAnnotationField])
} else = params {
  params := {}
}

parameters(policyID) = params {
  params := object.union(core.parameters[policyID], extra_parameters(policyID))
}

