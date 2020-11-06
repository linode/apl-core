# @title Images must not use the latest tag
#
# Using the latest tag on images can cause unexpected problems in production. By specifying a pinned version
# we can have higher confidence that our applications are immutable and do not change unexpectedly.
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package latest_tag_container

import data.lib.core
import data.lib.pods

policyID := "none"

violation[msg] {
    pods.containers[container]
    has_latest_tag(container)

    msg := core.format_with_id(sprintf("%s/%s/%s: Images must not use the latest tag", [core.kind, core.name, container.name]), policyID)
}

has_latest_tag(c) {
    endswith(c.image, ":latest")
}

has_latest_tag(c) {
    contains(c.image, ":") == false
}
