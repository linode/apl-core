{{/*
memcachedExporter imagePullSecrets
*/}}
{{- define "tempo.memcachedExporterImagePullSecrets" -}}
{{- $dict := dict "component" .Values.memcachedExporter.image "global" .Values.global.image "tempo" (dict) -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
