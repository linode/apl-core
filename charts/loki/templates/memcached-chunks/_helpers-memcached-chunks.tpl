{{/*
memcached-chunks fullname
*/}}
{{- define "loki.memcachedChunksFullname" -}}
{{ include "loki.fullname" . }}-memcached-chunks
{{- end }}

{{/*
memcached-chunks fullname
*/}}
{{- define "loki.memcachedChunksLabels" -}}
{{ include "loki.labels" . }}
app.kubernetes.io/component: memcached-chunks
{{- end }}

{{/*
memcached-chunks selector labels
*/}}
{{- define "loki.memcachedChunksSelectorLabels" -}}
{{ include "loki.selectorLabels" . }}
app.kubernetes.io/component: memcached-chunks
{{- end }}

{{/*
memcached-chunks priority class name
*/}}
{{- define "loki.memcachedChunksPriorityClassName" -}}
{{- $pcn := coalesce .Values.global.priorityClassName .Values.memcachedChunks.priorityClassName -}}
{{- if $pcn }}
priorityClassName: {{ $pcn }}
{{- end }}
{{- end }}
