# @title Containers must not use disallowed  AppArmor profiles
#
# Kubernetes AppArmor enforcement works by first checking that all the prerequisites have been met, 
# and then forwarding the profile selection to the container runtime for enforcement
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package pspapparmor
import data.lib.core
import data.lib.pods
import data.lib.exceptions
import data.lib.parameters

policyID = "psp-apparmor"

default appArmorAnnotation = "container.apparmor.security.beta.kubernetes.io"

violation[{"msg": msg, "details": {}}] {
  not exceptions.is_exception(policyID)
  metadata := core.resource.metadata
  pods.containers[container]
  has_apparmor_profile_loaded(metadata)
  not input_apparmor_allowed(container, metadata)
  msg := sprintf("Policy: %s - AppArmor profile is not allowed, pod: %v, container: %v. Allowed profiles: %v", [policyID, core.resource.metadata.name, container.name, parameters.parameters(policyID).allowedProfiles])
}
input_apparmor_allowed(container, metadata) {
  metadata.annotations[key] == parameters.parameters(policyID).allowedProfiles[_]
  key == sprintf("%v/%v", [appArmorAnnotation, container.name])
}

has_apparmor_profile_loaded(metadata) = true {
  metadata.annotations[key]
  startswith(key, appArmorAnnotation)
}