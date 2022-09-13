# Other DNS provider

Maurice:

**Background:**

We collect one set of configuration for DNS, which is following the schema of the `external-dns` chart. That same config is mapped onto the cert-manager chart.

**Change introduced:**

Since `cert-manager` charts only has a limited set of providers, but `external-dns` chart has lots, we now also offer an extra provider option `other`. This option asks for a provider name and a yaml blob for `external-dns`, and a yaml blob for `cert-manager` that will be used for the `cluster-issuer`'s `dns01` section.
