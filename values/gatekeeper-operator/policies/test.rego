# @REMOVE this is a test
package k8sbannedimagetags
import data.lib.helpers
import data.lib.helpers.object

deny[msg] {
  input.kind == "Pod"
  image := object.spec.containers[_].image
  not startswith(image, "hooli.com")
  msg := sprintf("image fails to come from trusted registry: %v", [image])
}