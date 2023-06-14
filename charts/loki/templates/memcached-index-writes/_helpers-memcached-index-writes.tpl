{{/*
memcached-index-writes fullname
*/}}
{{- define "loki.memcachedIndexWritesFullname" -}}
{{ include "loki.fullname" . }}-memcached-index-writes
{{- end }}

{{/*
memcached-index-writes fullname
*/}}
{{- define "loki.memcachedIndexWritesLabels" -}}
{{ include "loki.labels" . }}
app.kubernetes.io/component: memcached-index-writes
{{- end }}

{{/*
memcached-index-writes selector labels
*/}}
{{- define "loki.memcachedIndexWritesSelectorLabels" -}}
{{ include "loki.selectorLabels" . }}
app.kubernetes.io/component: memcached-index-writes
{{- end }}

{{/*
memcached-index-writes priority class name
*/}}
{{- define "loki.memcachedIndexWritesPriorityClassName" -}}
{{- $pcn := coalesce .Values.global.priorityClassName .Values.memcachedIndexWrites.priorityClassName -}}
{{- if $pcn }}
priorityClassName: {{ $pcn }}
{{- end }}
{{- end }}
