{{/* vim: set filetype=mustache: */}}

{{/* names */}}

{{- define "gitea.service.http.name" -}}
{{ include "gitea.fullname" . }}-http
{{- end }}

{{- define "gitea.service.ssh.name" -}}
{{ include "gitea.fullname" . }}-ssh
{{- end }}
