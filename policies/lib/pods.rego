package lib.pods

import data.lib.core

default pod = false

pod = core.resource.spec.template {
	pod_templates := ["daemonset", "deployment", "job", "pod", "replicaset", "replicationcontroller", "statefulset"]
	lower(core.kind) == pod_templates[_]
}

pod = core.resource {
	lower(core.kind) == "pod"
}

pod = core.resource.spec.jobTemplate.spec.template {
	lower(core.kind) == "cronjob"
}

containers[container] {
	keys := {"containers", "initContainers"}
	all_containers := [c | keys[k]; c := pod.spec[k][_]]
	container := all_containers[_]
}

volumes[volume] {
	volume := pod.spec.volumes[_]
}
