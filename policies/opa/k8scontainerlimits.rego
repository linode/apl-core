package k8scontainerlimits
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
  general_violation[{"msg": msg, "field": "containers"}]
}
violation[{"msg": msg}] {
  general_violation[{"msg": msg, "field": "initContainers"}]
}
general_violation[{"msg": msg, "field": field}] {
  container := input.review.object.spec[field][_]
  cpu_orig := container.resources.limits.cpu
  not canonify_cpu(cpu_orig)
  msg := sprintf("container <%v> cpu limit <%v> could not be parsed", [container.name, cpu_orig])
}
general_violation[{"msg": msg, "field": field}] {
  container := input.review.object.spec[field][_]
  mem_orig := container.resources.limits.memory
  not canonify_mem(mem_orig)
  msg := sprintf("container <%v> memory limit <%v> could not be parsed", [container.name, mem_orig])
}
general_violation[{"msg": msg, "field": field}] {
  container := input.review.object.spec[field][_]
  not container.resources
  msg := sprintf("container <%v> has no resource limits", [container.name])
}
general_violation[{"msg": msg, "field": field}] {
  container := input.review.object.spec[field][_]
  not container.resources.limits
  msg := sprintf("container <%v> has no resource limits", [container.name])
}
general_violation[{"msg": msg, "field": field}] {
  container := input.review.object.spec[field][_]
  missing(container.resources.limits, "cpu")
  msg := sprintf("container <%v> has no cpu limit", [container.name])
}
general_violation[{"msg": msg, "field": field}] {
  container := input.review.object.spec[field][_]
  missing(container.resources.limits, "memory")
  msg := sprintf("container <%v> has no memory limit", [container.name])
}
general_violation[{"msg": msg, "field": field}] {
  container := input.review.object.spec[field][_]
  cpu_orig := container.resources.limits.cpu
  cpu := canonify_cpu(cpu_orig)
  max_cpu_orig := input.parameters.cpu
  max_cpu := canonify_cpu(max_cpu_orig)
  cpu > max_cpu
  msg := sprintf("container <%v> cpu limit <%v> is higher than the maximum allowed of <%v>", [container.name, cpu_orig, max_cpu_orig])
}
general_violation[{"msg": msg, "field": field}] {
  container := input.review.object.spec[field][_]
  mem_orig := container.resources.limits.memory
  mem := canonify_mem(mem_orig)
  max_mem_orig := input.parameters.memory
  max_mem := canonify_mem(max_mem_orig)
  mem > max_mem
  msg := sprintf("container <%v> memory limit <%v> is higher than the maximum allowed of <%v>", [container.name, mem_orig, max_mem_orig])
}


deny[msg] {
  input.kind == "Pod"
  image := input.spec.containers[_].image
  not startswith(image, "hooli.com")
  msg := sprintf("image fails to come from trusted registry: %v", [image])
}