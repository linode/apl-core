package lib.rbac

test_rule_has_verb_with_use {
    input := {"verbs": ["use"]}

    rule_has_verb(input, "use")
}

test_rule_has_verb_with_asterisk {
    input := {"verbs": ["*"]}

    rule_has_verb(input, "use")
}

test_rule_has_verb_with_list {
    input := {"verbs": ["list"]}

    not rule_has_verb(input, "use")
}

test_rule_has_resource_type_with_pod {
    input := {"resources": ["Pod"]}

    rule_has_resource_type(input, "pod")
}

test_rule_has_resource_type_with_resourceall {
    input := {"resources": ["*"]}

    rule_has_resource_type(input, "pod")
}

test_rule_has_resource_type_with_container {
    input := {"resources": ["Container"]}

    not rule_has_resource_type(input, "pod")
}

test_rule_has_resource_name_match {
    input := {"resourceNames": ["test"]}

    rule_has_resource_name(input, "test")
}

test_rule_has_resource_name_no_match {
    input := {"resourceNames": ["test"]}

    not rule_has_resource_name(input, "wrong")
}

test_rule_has_resource_name_null {
    input := {}

    rule_has_resource_name(input, "wrong")
}
