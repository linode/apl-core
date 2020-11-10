# @title Containers
#
#
# @kinds apps/DaemonSet apps/Deployment apps/StatefulSet core/Pod
package containerlimits
import data.lib.core
import data.lib.pods

policyID = "containerlimits"

missing(obj, field) = true {
  not obj[field]
}
missing(obj, field) = true {
  obj[field] == ""
}
canonify_cpu(orig) = new {
  is_number(orig)
  new := orig * 1000
}
canonify_cpu(orig) = new {
  not is_number(orig)
  endswith(orig, "m")
  new := to_number(replace(orig, "m", ""))
}
canonify_cpu(orig) = new {
  not is_number(orig)
  not endswith(orig, "m")
  re_match("^[0-9]+$", orig)
  new := to_number(orig) * 1000
}
# 10 ** 18
mem_multiple("E") = 1000000000000000000 { true }
# 10 ** 15
mem_multiple("P") = 1000000000000000 { true }
# 10 ** 12
mem_multiple("T") = 1000000000000 { true }
# 10 ** 9
mem_multiple("G") = 1000000000 { true }
# 10 ** 6
mem_multiple("M") = 1000000 { true }
# 10 ** 3
mem_multiple("K") = 1000 { true }
# 10 ** 0
mem_multiple("") = 1 { true }
# 2 ** 10
mem_multiple("Ki") = 1024 { true }
# 2 ** 20
mem_multiple("Mi") = 1048576 { true }
# 2 ** 30
mem_multiple("Gi") = 1073741824 { true }
# 2 ** 40
mem_multiple("Ti") = 1099511627776 { true }
# 2 ** 50
mem_multiple("Pi") = 1125899906842624 { true }
# 2 ** 60
mem_multiple("Ei") = 1152921504606846976 { true }
get_suffix(mem) = suffix {
  not is_string(mem)
  suffix := ""
}
get_suffix(mem) = suffix {
  is_string(mem)
  count(mem) > 0
  suffix := substring(mem, count(mem) - 1, -1)
  mem_multiple(suffix)
}
get_suffix(mem) = suffix {
  is_string(mem)
  count(mem) > 1
  suffix := substring(mem, count(mem) - 2, -1)
  mem_multiple(suffix)
}
get_suffix(mem) = suffix {
  is_string(mem)
  count(mem) > 1
  not mem_multiple(substring(mem, count(mem) - 1, -1))
  not mem_multiple(substring(mem, count(mem) - 2, -1))
  suffix := ""
}
get_suffix(mem) = suffix {
  is_string(mem)
  count(mem) == 1
  not mem_multiple(substring(mem, count(mem) - 1, -1))
  suffix := ""
}
get_suffix(mem) = suffix {
  is_string(mem)
  count(mem) == 0
  suffix := ""
}
canonify_mem(orig) = new {
  is_number(orig)
  new := orig
}
canonify_mem(orig) = new {
  not is_number(orig)
  suffix := get_suffix(orig)
  raw := replace(orig, suffix, "")
  re_match("^[0-9]+$", raw)
  new := to_number(raw) * mem_multiple(suffix)
}
violation[{"msg": msg}] {
  core.parameters.containerlimits.enabled
  general_violation[{"msg": msg}]
}
# violation[{"msg": msg}] {
#   general_violation[{"msg": msg}]
# }
general_violation[{"msg": msg}] {
  pods.containers[container]
  cpu_orig := container.resources.limits.cpu
  not canonify_cpu(cpu_orig)
  msg := sprintf("Policy: %s - container <%v> cpu limit <%v> could not be parsed", [policyID, container.name, cpu_orig])
}
general_violation[{"msg": msg}] {
  pods.containers[container]
  mem_orig := container.resources.limits.memory
  not canonify_mem(mem_orig)
  msg := sprintf("Policy: %s - container <%v> memory limit <%v> could not be parsed", [policyID, container.name, mem_orig])
}
general_violation[{"msg": msg}] {
  pods.containers[container]
  not container.resources
  msg := sprintf("Policy: %s - container <%v> has no resource limits", [policyID, container.name])
}
general_violation[{"msg": msg}] {
  pods.containers[container]
  not container.resources.limits
  msg := sprintf("Policy: %s - container <%v> has no resource limits", [policyID, container.name])
}
general_violation[{"msg": msg}] {
  pods.containers[container]
  missing(container.resources.limits, "cpu")
  msg := sprintf("Policy: %s - container <%v> has no cpu limit", [policyID, container.name])
}
general_violation[{"msg": msg}] {
  pods.containers[container]
  missing(container.resources.limits, "memory")
  msg := sprintf("Policy: %s - container <%v> has no memory limit", [policyID, container.name])
}
general_violation[{"msg": msg}] {
  pods.containers[container]
  cpu_orig := container.resources.limits.cpu
  cpu := canonify_cpu(cpu_orig)
  max_cpu_orig := core.parameters.containerlimits.cpu
  max_cpu := canonify_cpu(max_cpu_orig)
  cpu > max_cpu
  msg := sprintf("Policy: %s - container <%v> cpu limit <%v> is higher than the maximum allowed of <%v>", [policyID, container.name, cpu_orig, max_cpu_orig])
}
general_violation[{"msg": msg}] {
  pods.containers[container]
  mem_orig := container.resources.limits.memory
  mem := canonify_mem(mem_orig)
  max_mem_orig := core.parameters.containerlimits.memory
  max_mem := canonify_mem(max_mem_orig)
  mem > max_mem
  msg := sprintf("Policy: %s - container <%v> memory limit <%v> is higher than the maximum allowed of <%v>", [policyID, container.name, mem_orig, max_mem_orig])
}


