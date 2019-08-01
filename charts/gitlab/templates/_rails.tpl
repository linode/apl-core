{{/* vim: set filetype=mustache: */}}
{{/* ######### Generic rails templates */}}

{{/*
Return the rails secrets.yml secret
*/}}
{{- define "gitlab.rails-secrets.secret" -}}
{{- default (printf "%s-rails-secret" .Release.Name) .Values.global.railsSecrets.secret | quote -}}
{{- end -}}
