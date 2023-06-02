{{/*
memcached-frontend fullname
*/}}
{{- define "loki.memcachedFrontendFullname" -}}
{{ include "loki.fullname" . }}-memcached-frontend
{{- end }}

{{/*
memcached-frontend labels
*/}}
{{- define "loki.memcachedFrontendLabels" -}}
{{ include "loki.labels" . }}
app.kubernetes.io/component: memcached-frontend
{{- end }}

{{/*
memcached-frontend selector labels
*/}}
{{- define "loki.memcachedFrontendSelectorLabels" -}}
{{ include "loki.selectorLabels" . }}
app.kubernetes.io/component: memcached-frontend
{{- end }}

{{/*
memcached-frontend priority class name
*/}}
{{- define "loki.memcachedFrontendPriorityClassName" -}}
{{- $pcn := coalesce .Values.global.priorityClassName .Values.memcachedFrontend.priorityClassName -}}
{{- if $pcn }}
priorityClassName: {{ $pcn }}
{{- end }}
{{- end }}
