{{/* vim: set filetype=mustache: */}}

{{/* annotations */}}

{{- define "gitea.clientSettingsPolicies.annotations" -}}
{{- with .Values.gatewayAPI.nginx.clientSettingsPolicies.annotations }}
{{- toYaml . -}}
{{- end }}
{{- end }}

{{/* enabled */}}

{{- define "gitea.clientSettingsPolicies.enabled" -}}
{{- if and .Values.gatewayAPI.enabled
          .Values.gatewayAPI.nginx.clientSettingsPolicies.enabled
-}}
true
{{- else -}}
false
{{- end -}}
{{- end }}

{{/* labels */}}

{{- define "gitea.clientSettingsPolicies.labels" -}}
{{ include "gitea.labels" . }}
{{- with .Values.gatewayAPI.nginx.clientSettingsPolicies.labels }}
{{ toYaml . }}
{{- end }}
{{- end }}
