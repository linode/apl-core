package lib.exceptions
# Using resource wrapper logic to obtain exceptions metadata from annotations 
# Usage:
# 
# import data.lib.exceptions
# policyID = ...
# 
# violation[{"msg": msg}] {
#     exceptions.is_exception(policyID)
#     ...
# }
# 
# parameters = exceptions.parameters(policyID)
# 

import data.lib.core

default ignoreAnnotationField = "policies.otomi.io/ignore"
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

is_exception(policyID) = true  {
    ignoreList := split(core.annotations[ignoreAnnotationField],",")
    ignoreList[_] == policyID
}
