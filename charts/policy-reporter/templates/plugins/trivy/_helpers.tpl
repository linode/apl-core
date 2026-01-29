{{/*
Expand the name of the chart.
*/}}
{{- define "trivy-plugin.name" -}}
{{ template "policyreporter.name" . }}-trivy-plugin
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "trivy-plugin.fullname" -}}
{{ template "policyreporter.fullname" . }}-trivy-plugin
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "trivy-plugin.chart" -}}
{{ template "policyreporter.chart" . }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "trivy-plugin.labels" -}}
{{ include "trivy-plugin.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- if not .Values.static }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ include "trivy-plugin.chart" . }}
{{- end }}
{{- with .Values.global.labels }}
{{ toYaml . }}
{{- end -}}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "trivy-plugin.selectorLabels" -}}
{{- if .Values.plugin.trivy.selectorLabels }}
{{- toYaml .Values.plugin.trivy.selectorLabels }}
{{- else -}}
app.kubernetes.io/name: {{ include "trivy-plugin.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "trivy-plugin.serviceAccountName" -}}
{{- if .Values.plugin.trivy.serviceAccount.create }}
{{- default (include "trivy-plugin.fullname" .) .Values.plugin.trivy.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.plugin.trivy.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "trivy-plugin.podDisruptionBudget" -}}
{{- if and .Values.plugin.trivy.podDisruptionBudget.minAvailable .Values.plugin.trivy.podDisruptionBudget.maxUnavailable }}
{{- fail "Cannot set both" -}}
{{- end }}
{{- if not .Values.plugin.trivy.podDisruptionBudget.maxUnavailable }}
minAvailable: {{ default 1 .Values.plugin.trivy.podDisruptionBudget.minAvailable }}
{{- end }}
{{- if .Values.plugin.trivy.podDisruptionBudget.maxUnavailable }}
maxUnavailable: {{ .Values.plugin.trivy.podDisruptionBudget.maxUnavailable }}
{{- end }}
{{- end }}
