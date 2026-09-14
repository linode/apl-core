{{/* vim: set filetype=mustache: */}}

{{/* annotations */}}

{{- define "gitea.tcpRoute.annotations" -}}
{{- with .Values.gatewayAPI.core.tcpRoute.annotations }}
{{- toYaml . -}}
{{- end }}
{{- end }}

{{/* enabled */}}

{{- define "gitea.tcpRoute.enabled" -}}
{{- if and .Values.gatewayAPI.enabled
           .Values.gatewayAPI.core.tcpRoute.enabled
-}}
true
{{- else -}}
false
{{- end -}}
{{- end }}

{{/* labels */}}

{{- define "gitea.tcpRoute.labels" -}}
{{ include "gitea.labels" . }}
{{- with .Values.gatewayAPI.core.tcpRoute.labels }}
{{ toYaml . }}
{{- end }}
{{- end }}
