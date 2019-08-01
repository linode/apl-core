{{/* ######### GitLab related templates */}}

{{/*
Return the initial root password secret name
*/}}
{{- define "gitlab.migrations.initialRootPassword.secret" -}}
{{- default (printf "%s-gitlab-initial-root-password" .Release.Name) .Values.global.initialRootPassword.secret | quote -}}
{{- end -}}

{{/*
Return the initial root password secret key
*/}}
{{- define "gitlab.migrations.initialRootPassword.key" -}}
{{- coalesce .Values.global.initialRootPassword.key "password" | quote -}}
{{- end -}}
