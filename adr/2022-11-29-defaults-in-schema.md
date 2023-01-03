# Default values

Maurice:

Building onto [this ADR](./2021-10-18-defaults-and-derived.md)
We now build values like this:

1. Defaults from `values-schema.yaml` are transpiled to `values/defaults.yaml`
2. The profile as configured in `cluster.profile` will choose `values/profile-(small).yaml (medium|large coming soon)
3. Empty defaults for dict and list are still provided in `helmfile.d/snippets/defaults.yaml`
4. Derived values are still loaded in `helmfile.d/snippets/derived.gotmpl`
