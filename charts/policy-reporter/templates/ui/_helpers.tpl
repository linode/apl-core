{{/*
Expand the name of the chart.
*/}}
{{- define "ui.name" -}}
{{ template "policyreporter.name" . }}-ui
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "ui.fullname" -}}
{{ template "policyreporter.fullname" . }}-ui
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "ui.chart" -}}
{{ template "policyreporter.chart" . }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "ui.labels" -}}
{{ include "ui.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- if not .Values.static }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ include "ui.chart" . }}
{{- end }}
{{- with .Values.global.labels }}
{{ toYaml . }}
{{- end -}}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "ui.selectorLabels" -}}
{{- if .Values.ui.selectorLabels }}
{{- toYaml .Values.ui.selectorLabels }}
{{- else -}}
app.kubernetes.io/name: {{ include "ui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "ui.serviceAccountName" -}}
{{- if .Values.ui.serviceAccount.create }}
{{- default (include "ui.fullname" .) .Values.ui.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.ui.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "ui.podDisruptionBudget" -}}
{{- if and .Values.ui.podDisruptionBudget.minAvailable .Values.ui.podDisruptionBudget.maxUnavailable }}
{{- fail "Cannot set both" -}}
{{- end }}
{{- if not .Values.ui.podDisruptionBudget.maxUnavailable }}
minAvailable: {{ default 1 .Values.ui.podDisruptionBudget.minAvailable }}
{{- end }}
{{- if .Values.ui.podDisruptionBudget.maxUnavailable }}
maxUnavailable: {{ .Values.ui.podDisruptionBudget.maxUnavailable }}
{{- end }}
{{- end }}
