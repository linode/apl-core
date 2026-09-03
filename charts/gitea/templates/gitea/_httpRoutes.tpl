{{/* vim: set filetype=mustache: */}}

{{/* annotations */}}

{{- define "gitea.httpRoute.annotations" -}}
{{- with .Values.gatewayAPI.core.httpRoute.annotations }}
{{- toYaml . -}}
{{- end }}
{{- end }}

{{/* enabled */}}

{{- define "gitea.httpRoute.enabled" -}}
{{- if and .Values.gatewayAPI.enabled
          .Values.gatewayAPI.core.httpRoute.enabled
-}}
true
{{- else -}}
false
{{- end -}}
{{- end }}

{{/* labels */}}

{{- define "gitea.httpRoute.labels" -}}
{{ include "gitea.labels" . }}
{{- with .Values.gatewayAPI.core.httpRoute.labels }}
{{ toYaml . }}
{{- end }}
{{- end }}
