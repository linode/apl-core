{{/* vim: set filetype=mustache: */}}

{{/* annotations */}}

{{- define "gitea.backendTLSPolicy.annotations" -}}
{{- with .Values.gatewayAPI.core.backendTLSPolicy.annotations }}
{{- toYaml . -}}
{{- end }}
{{- end }}

{{/* enabled */}}

{{- define "gitea.backendTLSPolicy.enabled" -}}
{{- if and .Values.gatewayAPI.enabled
          .Values.gatewayAPI.core.backendTLSPolicy.enabled
-}}
true
{{- else -}}
false
{{- end -}}
{{- end }}

{{/* labels */}}

{{- define "gitea.backendTLSPolicy.labels" -}}
{{ include "gitea.labels" . }}
{{- with .Values.gatewayAPI.core.backendTLSPolicy.labels }}
{{ toYaml . }}
{{- end }}
{{- end }}
