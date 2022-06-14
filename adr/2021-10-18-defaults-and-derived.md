# Derived values

Maurice:

We split up the reading of the values into 3 steps:

1. Defaults (will come from schema eventually, but is now in `helmfile.d/snippets/defaults.yaml`)
2. User input coming from the files in $ENV_DIR
3. Derived values (based on the aggregated values from step 1 and 2) which are loaded in `helmfile.d/snippets/derived.gotmpl`

This allows us to manage user input more cleanly, and not write back defaults or derived values to the ENV_DIR, as those are NOT user input.
