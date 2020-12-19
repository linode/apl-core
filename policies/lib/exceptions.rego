package lib.exceptions
# Using resource wrapper logic to obtain exceptions metadata from annotations 
# Usage:
# 
# import data.lib.exceptions
# policyID = ...
# 
# violation[{"msg": msg}] {
#     not exceptions.is_exception(policyID)
#     ...
# }
# 

import data.lib.core
import data.lib.parameters
import data.lib.annotations

is_exception(policyID) = true  {
  annotations_object := annotations.policy_annotations()
  core.has_field(annotations_object, annotations.ignoreAnnotationField)
  annotations_object[annotations.ignoreAnnotationField] != null
  ignoreList := split(annotations_object[annotations.ignoreAnnotationField],",")
  ignoreList[_] == policyID
} {
  not parameters.parameters(policyID).enabled
}
