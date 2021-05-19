package lib.exceptions

# Using resource wrapper logic to obtain exceptions metadata from annotations 
# Usage:
# 
# import data.lib.exceptions
# policyID := ...
# 
# violation[{"msg": msg}] {
#     not exceptions.is_exception(policyID)
#     ...
# }
# 

import data.lib.annotations
import data.lib.core
import data.lib.parameters

get_safe_annotation[return] {
	all_annotations := annotations.merge_annotations()
	trace(sprintf("all_annotations: %v", [all_annotations]))
	policy_list := sprintf("%s,%s", [
		object.get(all_annotations, annotations.ignoreAnnotationField, ""),
		object.get(all_annotations, annotations.sidecarAnnotationField, ""),
	])

	trace(sprintf("pod ignore list: %v", [policy_list]))
	return := split(policy_list, ",")
}

is_exception(policyID) {
	get_safe_annotation[ignore_list]
	ignore_list[_] == policyID
}

is_container_exception(cname, policyID) {
	all_annotations := annotations.merge_annotations()
	policy_list := object.get(all_annotations, annotations.get_container_ignore_field(cname), "")
	trace(sprintf("container ignore list: %v", [policy_list]))
	ignore_list := split(policy_list, ",")
	ignore_list[_] == policyID
}

is_exception(policyID) {
	not parameters.policy_parameters(policyID).enabled
}
