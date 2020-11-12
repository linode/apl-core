package lib.utils

exists(obj, k) {
  _ = obj[k]
}

pick(k, obj1, obj2) = v {
  v := obj1[k]
}

pick(k, obj1, obj2) = v {
  not exists(obj1, k)
  v := obj2[k]
}

merge(a, b) = c {
  keys := {k | _ = a[k]} | {k | _ = b[k]}
  c := {k: v | k := keys[_]; v := pick(k, b, a)}
}

