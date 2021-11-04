Marc:

We added an `internal` tag at the same level as `cluster` and `otomi`, which is ignored by bootstrap and other aspects of the CLI code
This tag is introduced to prevent the re-coding of the same variable over and over again, and just make it available under `$v.internal.<tag>`

To make sure that validatation does not fail `additionalProperties` are set to true.
But `<tag>` can also be defined in the schema, so developers know what is accessible to them.
Right now one tag is introduced: `untrustedCA` which is a combination of letsEncrypt staging or customCA
We can add other tags as necessary to reduce the number of duplicate calculations that can potentially introduce errors

To fill these `internal.<property>`s we template them in `helmfile.d/snippets/derived.gotmpl`
