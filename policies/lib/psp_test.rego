package lib.psps

test_exception_pos {
    input := {"metadata": {"name": "gce.privileged"}}
    is_exception with input as input
}

test_exception_neg {
    input := {"metadata": {"name": "test"}}
    not is_exception with input as input
}
