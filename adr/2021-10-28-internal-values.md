Marc:

We added a `_derived` root prop which holds meaningful prop names that have compound logic. This is to prevent boilerplating the same logic over and over again.

Any `_derived.*` props _must_ be set in `helmfile.d/snippets/derived.gotmpl`.
