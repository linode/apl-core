package lib.exceptions
# Using resource wrapper logic to obtain exceptions metadata from annotations 
# Usage:
# 
# import data.lib.exceptions
# policyID = ...
# 
# violation[{"msg": msg}] {
#     not is_exception(policyID)
# }
# 
# parameters = exceptions.parameters(policyID)
# 

import data.lib.core
import data.lib.utils

default ignoreAnnotation = "policies.otomi.io/ignore"
default paramsAnnotation = "policies.otomi.io/parameters"

extra_parameters(policyID) = params {
    core.annotations != null
    core.has_field(core.annotations, sprintf("%s.%s",[paramsAnnotation, policyID]))
	params := json.unmarshal( core.annotations[policyAnnotation] )
} else = params {
    params := {}
}

parameters(policyID) = params {
    params := utils.merge(data.parameters[policyID], extra_parameters(policyID))
}

is_exception(policyID) = true  {
    ignoreList := split(core.annotations[ignoreAnnotation],",")
    ignoreList[_] == policyID
}
