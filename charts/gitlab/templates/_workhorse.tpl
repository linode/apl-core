{{/* ######### gitlab-workhorse related templates */}}

{{/*
Return the gitlab-workhorse secret
*/}}

{{- define "gitlab.workhorse.secret" -}}
{{- default (printf "%s-gitlab-workhorse-secret" .Release.Name) .Values.global.workhorse.secret | quote -}}
{{- end -}}

{{- define "gitlab.workhorse.key" -}}
{{- default "shared_secret" .Values.global.workhorse.key | quote -}}
{{- end -}}
