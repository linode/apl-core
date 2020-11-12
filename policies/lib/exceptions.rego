package lib.exceptions
# Usage:
# 
# import data.lib.exceptions
# policyID = ...
# violation[{"msg": msg}] {
#     not is_exception(policyID)
# }
# 

import data.lib.core

default ignoreAnnotation = "policies.otomi.io/ignore"
default paramsAnnotation = "policies.otomi.io/parameters"

extra_parameters(policyID) = params {
	params := json.unmarshal( core.annotations[sprintf("%s.%s",[paramsAnnotation, policyID])] )
}

is_exception(policyID) = true  {
    ignoreList := split(core.annotations[ignoreAnnotation],",")
    ignoreList[_] == policyID
}
