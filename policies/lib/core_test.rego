package lib.core

test_not_gk {
    input := {"kind": "test"}
    not is_gatekeeper with input as input
}

test_is_gk {
    input := {"review": {"object": {"kind": "test"}}}
    is_gatekeeper with input as input
}

test_has_field_pos {
    input := {"kind": "test"}
    has_field(input, "kind")
}

test_missing_field {
    input := {"kind": "test"}
    not has_field(input, "abc")
}
