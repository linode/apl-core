Chart customizations for Otomi:

## Required changes for using Civo DNS because it is not by default supported by external-dns

- Add to `values.yaml`:

```
civo:
  apiToken: ""
```

- Add to `_helpers.tmpl`:

```
{{- define "external-dns.civo-credentials" }}
[default]
apiKey = {{ .Values.civo.apiKey }}
{{ end }}
```

- Add to `{{- define "external-dns.createSecret" -}}` in `_helpers.tmpl`:

```
{{- else if and (eq .Values.provider "civo") .Values.civo.apiToken -}}
    {{- true -}}
```


- Add to the `env:` in `dep-ds.yaml`:

```
            {{- if eq .Values.provider "civo" }}
            - name: CIVO_TOKEN
              valueFrom:
                secretKeyRef:
                  name: {{ template "external-dns.secretName" . }}
                  key: apiKey
            {{- end }}
```

- Add to `data:` in `secret.yaml`:

```
  {{- if eq .Values.provider "civo" }}
  apiKey: {{ include "external-dns.civo-credentials" . | b64enc | quote }}
  {{- end }}
```

PR submitted to external-dns: NO