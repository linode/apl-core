package lib.security

dropped_capability(container, cap) {
    lower(container.securityContext.capabilities.drop[_]) == lower(cap)
}

dropped_capability(psp, cap) {
    lower(psp.spec.requiredDropCapabilities[_]) == lower(cap)
}

added_capability(container, cap) {
    lower(container.securityContext.capabilities.add[_]) == lower(cap)
}

added_capability(psp, cap) {
    lower(psp.spec.allowedCapabilities[_]) == lower(cap)
}

added_capability(psp, cap) {
    lower(psp.spec.defaultAddCapabilities[_]) == lower(cap)
}
