# @title Deny host filesystem  access
# Containers should not allow hostpath volumes other than 
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package psphostfilesystem

import data.lib.core
import data.lib.exceptions
import data.lib.parameters
import data.lib.pods

policyID = "psp-host-filesystem"

violation[{"msg": msg, "details": {}}] {
	not exceptions.is_exception(policyID)
	volume := input_hostpath_volumes[_]
	not input_hostpath_allowed(volume)
	msg := sprintf("Policy: %s - HostPath volume %v is not allowed, pod: %v. Allowed path: %v", [policyID, volume, core.review.object.metadata.name, parameters.policy_parameters(policyID).allowedHostPaths])
}

input_hostpath_allowed(volume) {
	# An empty list means there is no restriction on host paths used
	parameters.policy_parameters(policyID).allowedHostPaths == []
}

input_hostpath_allowed(volume) {
	allowedHostPath := parameters.policy_parameters(policyID).allowedHostPaths[_]
	path_matches(allowedHostPath.pathPrefix, volume.hostPath.path)
	not allowedHostPath.readOnly == true
}

input_hostpath_allowed(volume) {
	allowedHostPath := parameters.policy_parameters(policyID).allowedHostPaths[_]
	path_matches(allowedHostPath.pathPrefix, volume.hostPath.path)
	allowedHostPath.readOnly
	not writeable_input_volume_mounts(volume.name)
}

writeable_input_volume_mounts(volume_name) {
	pods.containers[container]
	mount := container.volumeMounts[_]
	mount.name == volume_name
	not mount.readOnly
}

# This allows "/foo", "/foo/", "/foo/bar" etc., but
# disallows "/fool", "/etc/foo" etc.
path_matches(prefix, path) {
	a := split(trim(prefix, "/"), "/")
	b := split(trim(path, "/"), "/")
	prefix_matches(a, b)
}

prefix_matches(a, b) {
	count(a) <= count(b)
	not any_not_equal_upto(a, b, count(a))
}

any_not_equal_upto(a, b, n) {
	a[i] != b[i]
	i < n
}

input_hostpath_volumes[v] {
	v := pods.volumes[volume]
	core.has_field(v, "hostPath")
}

# has_field returns whether an object has a field
# has_field(object, field) = true {
#     object[field]
# }
