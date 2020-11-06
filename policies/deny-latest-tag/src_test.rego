package container_deny_latest_tag

test_input_as_image_without_latest_tag {
    input := {"name": "test", "image": "image:1.0.0"}

    not has_latest_tag(input)
}

test_input_as_image_with_latest_tag {
    input := {"name": "test", "image": "image:latest"}

    has_latest_tag(input)
}

test_input_as_image_with_no_tag {
    input := {"name": "test", "image": "image"}

    has_latest_tag(input)
}
