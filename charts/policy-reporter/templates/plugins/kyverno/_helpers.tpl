{{/*
Expand the name of the chart.
*/}}
{{- define "kyverno-plugin.name" -}}
{{ template "policyreporter.name" . }}-kyverno-plugin
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "kyverno-plugin.fullname" -}}
{{ template "policyreporter.fullname" . }}-kyverno-plugin
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "kyverno-plugin.chart" -}}
{{ template "policyreporter.chart" . }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "kyverno-plugin.labels" -}}
{{ include "kyverno-plugin.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- if not .Values.static }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ include "kyverno-plugin.chart" . }}
{{- end -}}
{{- with .Values.global.labels }}
{{ toYaml . }}
{{- end -}}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "kyverno-plugin.selectorLabels" -}}
{{- if .Values.plugin.kyverno.selectorLabels }}
{{- toYaml .Values.plugin.kyverno.selectorLabels }}
{{- else -}}
app.kubernetes.io/name: {{ include "kyverno-plugin.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "kyverno-plugin.serviceAccountName" -}}
{{- if .Values.plugin.kyverno.serviceAccount.create }}
{{- default (include "kyverno-plugin.fullname" .) .Values.plugin.kyverno.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.plugin.kyverno.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "kyverno-plugin.podDisruptionBudget" -}}
{{- if and .Values.plugin.kyverno.podDisruptionBudget.minAvailable .Values.plugin.kyverno.podDisruptionBudget.maxUnavailable }}
{{- fail "Cannot set both" -}}
{{- end }}
{{- if not .Values.plugin.kyverno.podDisruptionBudget.maxUnavailable }}
minAvailable: {{ default 1 .Values.plugin.kyverno.podDisruptionBudget.minAvailable }}
{{- end }}
{{- if .Values.plugin.kyverno.podDisruptionBudget.maxUnavailable }}
maxUnavailable: {{ .Values.plugin.kyverno.podDisruptionBudget.maxUnavailable }}
{{- end }}
{{- end }}
