{{/*
Expand the name of the chart.
*/}}
{{- define "vap-plugin.name" -}}
{{ template "policyreporter.name" . }}-vap-plugin
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "vap-plugin.fullname" -}}
{{ template "policyreporter.fullname" . }}-vap-plugin
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "vap-plugin.chart" -}}
{{ template "policyreporter.chart" . }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "vap-plugin.labels" -}}
{{ include "vap-plugin.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- if not .Values.static }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ include "vap-plugin.chart" . }}
{{- end }}
{{- with .Values.global.labels }}
{{ toYaml . }}
{{- end -}}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "vap-plugin.selectorLabels" -}}
{{- if .Values.plugin.vap.selectorLabels }}
{{- toYaml .Values.plugin.vap.selectorLabels }}
{{- else -}}
app.kubernetes.io/name: {{ include "vap-plugin.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "vap-plugin.serviceAccountName" -}}
{{- if .Values.plugin.vap.serviceAccount.create }}
{{- default (include "vap-plugin.fullname" .) .Values.plugin.vap.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.plugin.vap.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "vap-plugin.podDisruptionBudget" -}}
{{- if and .Values.plugin.vap.podDisruptionBudget.minAvailable .Values.plugin.vap.podDisruptionBudget.maxUnavailable }}
{{- fail "Cannot set both" -}}
{{- end }}
{{- if not .Values.plugin.vap.podDisruptionBudget.maxUnavailable }}
minAvailable: {{ default 1 .Values.plugin.vap.podDisruptionBudget.minAvailable }}
{{- end }}
{{- if .Values.plugin.vap.podDisruptionBudget.maxUnavailable }}
maxUnavailable: {{ .Values.plugin.vap.podDisruptionBudget.maxUnavailable }}
{{- end }}
{{- end }}
