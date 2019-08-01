{{/* ######### Redis related templates */}}

{{/*
Return the redis hostname
If the postgresql host is provided, it will use that, otherwise it will fallback
to the service name
*/}}
{{- define "gitlab.redis.host" -}}
{{- if or .Values.redis.host .Values.global.redis.host -}}
{{- coalesce .Values.redis.host .Values.global.redis.host -}}
{{- else -}}
{{- $name := default "redis" .Values.redis.serviceName -}}
{{- printf "%s-%s" .Release.Name $name -}}
{{- end -}}
{{- end -}}

{{/*
Return the redis port
If the redis port is provided, it will use that, otherwise it will fallback
to 6379 default
*/}}
{{- define "gitlab.redis.port" -}}
{{- coalesce .Values.redis.port .Values.global.redis.port 6379 -}}
{{- end -}}

{{/*
Return the redis scheme, or redis. Allowing people to use rediss clusters
*/}}
{{- define "gitlab.redis.scheme" -}}
{{- $valid := list "redis" "rediss" "tcp" -}}
{{- $name := coalesce .Values.redis.scheme .Values.global.redis.scheme "redis" -}}
{{- if has $name $valid -}}
{{ $name }}
{{- else -}}
{{ cat "Invalid redis scheme" $name | fail }}
{{- end -}}
{{- end -}}

{{/*
Return the redis url.
*/}}
{{- define "gitlab.redis.url" -}}
{{ template "gitlab.redis.scheme" . }}://{{- if .Values.global.redis.password.enabled -}}:<%= URI.escape(File.read("/etc/gitlab/redis/password").strip) %>@{{- end -}}{{ template "gitlab.redis.host" . }}:{{ template "gitlab.redis.port" . }}
{{- end -}}
