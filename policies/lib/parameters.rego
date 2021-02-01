package lib.parameters

# Using  wrapper logic to obtain extra parameters from annotations 
# Match by policyID and merge default parameters passed as data object with extra parameters from annotations
# 
# import data.lib.parameters
# policyID = ...
# 
# parameters = parameters.policy_parameters(policyID)
# 

import data.lib.annotations
import data.lib.core

policy_parameters(policyID) = params {
	params := object.union(core.parameters[policyID], extra_parameters(policyID))
}

extra_parameters(policyID) = params {
	all_annotations := annotations.merge_annotations()
	policyAnnotationField := sprintf("%s.%s", [annotations.paramsAnnotationField, policyID])
	core.has_field(all_annotations, policyAnnotationField)
	params := json.unmarshal(all_annotations[policyAnnotationField])
} else = params {
	params := {}
}
