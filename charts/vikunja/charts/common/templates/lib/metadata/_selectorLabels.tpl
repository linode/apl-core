{{/* Selector labels shared across objects */}}
{{- define "bjw-s.common.lib.metadata.selectorLabels" -}}
app.kubernetes.io/name: {{ include "bjw-s.common.lib.chart.names.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
