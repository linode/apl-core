package lib.annotations
# Annotations helper library used to extract policy metadata information from annotation fields
# import data.lib.annotations
# 
# annotations = annotations.policy_annotations()
# 
# 
import data.lib.core
import data.lib.pods

default paramsAnnotationField = "policies.otomi.io/parameters"
default ignoreAnnotationField = "policies.otomi.io/ignore"

get_default(object, field, _default) = output {
	core.has_field(object, field)
  object[field] != null
	output = object[field]
}

get_default(object, field, _default) = output {
	core.has_field(object, field) == false
	output = _default
}

policy_annotations = return {
  return := object.union(
    get_default(core.resource.metadata, "annotations", {}), 
    get_default(pods.pod.metadata, "annotations", {}))
} else = return {
  return :=  get_default(pods.pod.metadata, "annotations", {})
  return != null
} else = return {
  return :=  get_default(core.resource.metadata, "annotations", {})
  return != null
} else = return {
  return := {}
}