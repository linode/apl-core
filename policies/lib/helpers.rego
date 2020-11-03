package lib.helpers
import data.parameters

default is_gatekeeper = false
has_field(obj, field) {
	obj[field]
}
is_gatekeeper {
	has_field(input, "review")
	has_field(input.review, "object")
}
object = input {
	not is_gatekeeper
}
object = input.review.object {
	is_gatekeeper
}
parameters = data.parameters  {
	not is_gatekeeper
}
parameters = input.parameters  {
	is_gatekeeper
}
review = input.review {
	is_gatekeeper
}
review = {"object":input, "kind":kind} {
	not is_gatekeeper
}
name = object.metadata.name
kind = object.kind
