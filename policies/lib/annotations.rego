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

merge_annotations = return {
	return := object.union(object.get(core.resource.metadata, "annotations", {}), object.get(pods.pod.metadata, "annotations", {}))
}
