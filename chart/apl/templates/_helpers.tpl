{{/*
Expand the name of the chart.
*/}}
{{- define "apl-operator.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
Always returns "apl-operator" to ensure consistent naming.
*/}}
{{- define "apl-operator.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
apl-operator
{{- end -}}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "apl-operator.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{/*
Deliberately free of helm.sh/chart and app.kubernetes.io/version: charts/apl-operator renders
the same Deployment once ArgoCD takes over, and those two labels can never agree across two
charts with different names and versions. Any difference keeps ArgoCD permanently OutOfSync.
*/}}
{{- define "apl-operator.labels" -}}
{{ include "apl-operator.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "apl-operator.selectorLabels" -}}
app.kubernetes.io/name: apl-operator
app.kubernetes.io/instance: apl-operator
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "apl-operator.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "apl-operator.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- .Values.serviceAccount.name }}
{{- end }}
{{- end }}

