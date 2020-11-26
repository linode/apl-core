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

import data.lib.core
import data.lib.parameters

default ignoreAnnotationField = "policies.otomi.io/ignore"

is_exception(policyID) = true  {
  ignoreList := split(core.annotations[ignoreAnnotationField],",")
  ignoreList[_] == policyID
} {
  not parameters.parameters(policyID).enabled
}
