package lib.pods

resource_matching_core := {
	"kind": "Deployment",
	"spec": {"template": {"spec": {"containers": [{"name": "matching", "image": "bla:ok"}]}}},
}

resource_matching_ksvc := {
	"kind": "Service",
	"apiVersion": "serving.knative.dev/v1",
	"spec": {"template": {"spec": {"containers": [{"name": "matching", "image": "bla:ok"}]}}},
}

resource_not_matching := {
	"kind": "Service",
	"apiVersion": "v1",
	"spec": {"template": {"spec": {"containers": [{"name": "not-matching", "image": "bla:ok"}]}}},
}

test_matching_core {
	pod with input as resource_matching_core
}

test_matching_ksvc {
	pod with input as resource_matching_ksvc
}

test_not_matching {
	not pod with input as resource_not_matching
}
