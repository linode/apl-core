{{/*
query-frontend fullname
*/}}
{{- define "loki.queryFrontendFullname" -}}
{{ include "loki.fullname" . }}-query-frontend
{{- end }}

{{/*
query-frontend common labels
*/}}
{{- define "loki.queryFrontendLabels" -}}
{{ include "loki.labels" . }}
app.kubernetes.io/component: query-frontend
{{- end }}

{{/*
query-frontend selector labels
*/}}
{{- define "loki.queryFrontendSelectorLabels" -}}
{{ include "loki.selectorLabels" . }}
app.kubernetes.io/component: query-frontend
{{- end }}

{{/*
query-frontend image
*/}}
{{- define "loki.queryFrontendImage" -}}
{{- $dict := dict "loki" .Values.loki.image "service" .Values.queryFrontend.image "global" .Values.global.image "defaultVersion" .Chart.AppVersion -}}
{{- include "loki.lokiImage" $dict -}}
{{- end }}

{{/*
query-frontend priority class name
*/}}
{{- define "loki.queryFrontendPriorityClassName" -}}
{{- $pcn := coalesce .Values.global.priorityClassName .Values.queryFrontend.priorityClassName -}}
{{- if $pcn }}
priorityClassName: {{ $pcn }}
{{- end }}
{{- end }}
