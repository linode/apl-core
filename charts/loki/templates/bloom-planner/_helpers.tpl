{{/*
bloom planner fullname
*/}}
{{- define "loki.bloomPlannerFullname" -}}
{{ include "loki.fullname" . }}-bloom-planner
{{- end }}

{{/*
bloom planner common labels
*/}}
{{- define "loki.bloomPlannerLabels" -}}
{{ include "loki.labels" . }}
app.kubernetes.io/component: bloom-planner
{{- end }}

{{/*
bloom planner selector labels
*/}}
{{- define "loki.bloomPlannerSelectorLabels" -}}
{{ include "loki.selectorLabels" . }}
app.kubernetes.io/component: bloom-planner
{{- end }}
