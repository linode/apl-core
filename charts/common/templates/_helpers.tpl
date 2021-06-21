{{- define "common.name" -}}
otomi-common
{{- end -}}

{{- define "common.labels" -}}
app: otomi
instance: common
{{- end -}}

{{- define "common.resources" -}}
resources:
  limits:
    cpu: 400m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi
{{- end -}}