# Meta-schema validation

We validate values with our `values-schema.yaml` JSON Schema. The supported version can always be found on top of the file for easy reference.

## Guidelines for describing strings

By having accurate and consistent descriptions (refer to `description` keys in `values-schema.yaml`), we can provide a better experience in configuring `otomi-values`. Refer to the [Kubernetes API documentation](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md#validation) on conventions for description writing.

### Examples

Excellent:

```

oauth2-proxy:
   type: object
   additionalProperties: false
   properties:
      config:
      type: object
         properties:
      cookieSecret:
         type: string
         description: Cookie secret must be 128 bit base64 encoded string.
         pattern: ^(?:[A-Za-z0-9+/]{4})\\\*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\$

```

Seeing a small improvement:

```

armAuth:
   type: object
   additionalProperties: false
   description: A service Principal secret
   properties:
   secretJSON:
      description: A service Principal secret JSON key (base64 encoded)
      type: string

```

This could be modified to:

```

armAuth:
   type: object
   additionalProperties: false
   description: A service Principal secret
   properties:
   secretJSON:
      description: Must be a service Principal secret JSON key (base64 encoded)
      type: string

```

etc.
