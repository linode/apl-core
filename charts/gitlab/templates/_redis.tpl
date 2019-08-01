{{/* ######### Redis related templates */}}

{{/*
Return the redis password secret name
*/}}
{{- define "gitlab.redis.password.secret" -}}
{{- default (printf "%s-redis-secret" .Release.Name) .Values.global.redis.password.secret | quote -}}
{{- end -}}

{{/*
Return the redis password secret key
*/}}
{{- define "gitlab.redis.password.key" -}}
{{- coalesce .Values.global.redis.password.key "secret" | quote -}}
{{- end -}}
