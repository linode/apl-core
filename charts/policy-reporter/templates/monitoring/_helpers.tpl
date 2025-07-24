{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "monitoring.fullname" -}}
{{ template "policyreporter.fullname" . }}-monitoring
{{- end }}

{{- define "monitoring.name" -}}
{{ template "policyreporter.name" . }}-monitoring
{{- end }}


{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "monitoring.chart" -}}
{{ template "policyreporter.chart" . }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "monitoring.labels" -}}
{{ include "monitoring.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/component: monitoring
app.kubernetes.io/part-of: kyverno
{{- if not .Values.static }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ include "monitoring.chart" . }}
{{- end }}
{{- with .Values.global.labels }}
{{ toYaml . }}
{{- end -}}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "monitoring.selectorLabels" -}}
app.kubernetes.io/name: {{ include "monitoring.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/* Get the namespace name. */}}
{{- define "monitoring.smNamespace" -}}
{{-  if .Values.monitoring.serviceMonitor.namespace -}}
{{- .Values.monitoring.serviceMonitor.namespace -}}
{{- else if .Values.namespaceOverride -}}
    {{- .Values.namespaceOverride -}}
{{- else -}}
{{- .Release.Namespace -}}
{{- end }}
{{- end }}
