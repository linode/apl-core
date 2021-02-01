package lib.annotations

# Annotations helper library used to extract policy metadata information from annotation fields
# Usage:
#
# import data.lib.annotations 
# annotations = annotations.merge_annotations()
# 

import data.lib.core
import data.lib.pods

default ignoreAnnotationField = "policy.otomi.io/ignore"

default sidecarAnnotationField = "policy.otomi.io/ignore-sidecar"

default paramsAnnotationField = "policy.otomi.io/parameters"

get_default(object, field, _default) = output {
	core.has_field(object, field)
	object[field] != null
	output = object[field]
}

get_default(object, field, _default) = output {
	core.has_field(object, field) == false
	output = _default
}

merge_annotations = return {
	return := object.union(get_default(core.resource.metadata, "annotations", {}), get_default(pods.pod.metadata, "annotations", {}))
} else = return {
	return := get_default(pods.pod.metadata, "annotations", {})
	return != null
} else = return {
	return := get_default(core.resource.metadata, "annotations", {})
	return != null
} else = return {
	return := {}
}
