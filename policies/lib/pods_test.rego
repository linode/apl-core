package lib.pods

test_input_as_other {
    input := {
        "kind": "Other",
        "spec": {
            "containers": [{}]
        }
    }

    resource := pod with input as input

    not resource
}

test_input_as_pod {
    input := {
        "kind": "Pod",
        "spec": {
            "containers": [{}]
        }
    }

    resource := pod with input as input

    resource.spec.containers
}

test_input_as_deployment {
    input := {
        "kind": "Deployment",
        "spec": {
            "template": {
                "spec": {
                    "containers": [{}]
                }
            }
        }
    }

    resource := pod with input as input

    resource.spec.containers
}

test_input_as_cronjob {
    input := {
        "kind": "CronJob",
        "spec": {
            "jobTemplate": {
                "spec": {
                    "template": {
                        "spec": {
                            "containers": [{}]
                        }
                    }
                }
            }
        }
    }

    resource := pod with input as input

    resource.spec.containers
}

test_containers {
    input := {
        "kind": "Pod",
        "spec": {
            "containers": [{"name": "container"}]
        }
    }

    podcontainers := containers with input as input

    podcontainers[_].name == "container"
}

test_volumes {
    input := {
        "kind": "Pod",
        "spec": {
            "volumes": [{"name": "volume"}]
        }
    }

    podvolumes := volumes with input as input

    podvolumes[_].name == "volume"
}
