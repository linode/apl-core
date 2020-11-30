package lib.parameters
# Using  wrapper logic to obtain extra parameters from annotations 
# Usage:
# 
# import data.lib.parameters
# policyID = ...
# 
# parameters = parameters.parameters(policyID)
# 

import data.lib.core
import data.lib.pods

default paramsAnnotationField = "policies.otomi.io/parameters"

default emptyAnnotations = {}

get_default(object, field, _default) = output {
	core.has_field(object, field)
  object[field] != null
	output = object[field]
}

get_default(object, field, _default) = output {
	core.has_field(object, field) == false
	output = _default
}

resource_annotations = annotations {
  resourceAnnotations := get_default(core.resource.metadata, "annotations", emptyAnnotations)
  templateAnnotations := get_default(pods.pod.metadata, "annotations", emptyAnnotations)
  annotations := object.union(resourceAnnotations, templateAnnotations)

}


extra_parameters(policyID) = params {
  annotations := resource_annotations()
  policyAnnotationField := sprintf("%s.%s", [paramsAnnotationField, policyID])
  core.has_field(annotations, policyAnnotationField)
  params := json.unmarshal(annotations[policyAnnotationField])
} else = params {
  params := {}
}

parameters(policyID) = params {
  params := object.union(core.parameters[policyID], extra_parameters(policyID))
}

