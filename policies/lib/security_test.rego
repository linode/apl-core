package lib.security

test_added_capabilities_container_match {
    input := {
        "securityContext": {
            "capabilities": {
                "add": ["CAP_SYS_ADMIN"]
            }
        }
    }

    added_capability(input, "CAP_SYS_ADMIN")
}

test_added_capabilities_container_nomatch {
    input := {
        "securityContext": {
            "capabilities": {
                "add": ["CAP_SYS_ADMIN"]
            }
        }
    }

    not added_capability(input, "test")
}

test_added_capabilities_psp_match {
    input := {"spec": {"allowedCapabilities": ["CAP_SYS_ADMIN"]}}

    added_capability(input, "CAP_SYS_ADMIN")
}

test_added_capabilities_psp_nomatch {
    input := {"spec": {"allowedCapabilities": ["CAP_SYS_ADMIN"]}}

    not added_capability(input, "test")
}

test_dropped_capabilities_container_match {
    input := {
        "securityContext": {
            "capabilities": {
                "drop": ["CAP_SYS_ADMIN"]
            }
        }
    }

    dropped_capability(input, "CAP_SYS_ADMIN")
}

test_dropped_capabilities_container_nomatch {
    input := {
        "securityContext": {
            "capabilities": {
                "drop": ["CAP_SYS_ADMIN"]
            }
        }
    }

    not dropped_capability(input, "test")
}

test_dropped_capabilities_psp_match {
    input := {"spec": {"requiredDropCapabilities": ["CAP_SYS_ADMIN"]}}

    dropped_capability(input, "CAP_SYS_ADMIN")
}

test_dropped_capabilities_psp_nomatch {
    input := {"spec": {"requiredDropCapabilities": ["CAP_SYS_ADMIN"]}}

    not dropped_capability(input, "test")
}
