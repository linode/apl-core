{{/* vim: set filetype=mustache: */}}

{{- define "kyverno-api.chartVersion" -}}
{{- .Chart.Version | replace "+" "_" -}}
{{- end -}}

{{- define "kyverno-api.labels" -}}
{{- tpl (toYaml .Values.labels) . -}}
{{- end -}}

{{- define "kyverno-api.annotations" -}}
{{- tpl (toYaml .Values.annotations) . -}}
{{- end -}}
