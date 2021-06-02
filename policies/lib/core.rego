package lib.core

default is_gatekeeper = false

import data.parameters as data_parameters

is_gatekeeper {
	has_field(input, "review")
	has_field(input.review, "object")
}

resource = input.review.object {
	is_gatekeeper
}

resource = input {
	not is_gatekeeper
}

review = input.review {
	is_gatekeeper
}

review = {"object": resource, "kind": {"group": group, "kind": kind, "version": version}} {
	not is_gatekeeper
}

# parameters = input.parameters {
# 	trace(sprintf("has input.parameters: %v", [input.parameters]))
# 	is_gatekeeper
# }

opa_upstream_bug_1046 := true

parameters := data_parameters

# parameters = data_parameters {
# 	trace(sprintf("has data.parameters: %v", [data_parameters]))
# 	not is_gatekeeper
# }

format(msg) = {"msg": msg}

format_with_id(msg, id) = msg_fmt {
	msg_fmt := {
		"msg": sprintf("%s: %s", [id, msg]),
		"details": {"policyID": id},
	}
}

apiVersion := resource.apiVersion

name := resource.metadata.name

gv := split(apiVersion, "/")

group = gv[0] {
	contains(apiVersion, "/")
}

group = "core" {
	not contains(apiVersion, "/")
}

version := gv[minus(count(gv), 1)]

kind := resource.kind

labels := resource.metadata.labels

annotations := resource.metadata.annotations

has_field(obj, field) {
	not object.get(obj, field, "N_DEFINED") == "N_DEFINED"
}

missing_field(obj, field) {
	obj[field] == ""
}

missing_field(obj, field) {
	not has_field(obj, field)
}
