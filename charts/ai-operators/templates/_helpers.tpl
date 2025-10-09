{{/*
Expand the name of the chart.
*/}}
{{- define "ai-operators.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "ai-operators.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
KB Operator fullname
*/}}
{{- define "ai-operators.kb-operator.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- printf "%s-kb-operator" .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-kb-operator" .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Agent Operator fullname
*/}}
{{- define "ai-operators.agent-operator.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- printf "%s-agent-operator" .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-agent-operator" .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
KB Operator labels
*/}}
{{- define "ai-operators.kb-operator.labels" -}}
helm.sh/chart: {{ include "ai-operators.chart" . }}
{{ include "ai-operators.kb-operator.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: kb-operator
{{- end }}

{{/*
KB Operator selector labels
*/}}
{{- define "ai-operators.kb-operator.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ai-operators.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: kb-operator
{{- end }}

{{/*
Agent Operator labels
*/}}
{{- define "ai-operators.agent-operator.labels" -}}
helm.sh/chart: {{ include "ai-operators.chart" . }}
{{ include "ai-operators.agent-operator.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: agent-operator
{{- end }}

{{/*
Agent Operator selector labels
*/}}
{{- define "ai-operators.agent-operator.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ai-operators.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: agent-operator
{{- end }}

{{/*
KB Operator service account name
*/}}
{{- define "ai-operators.kb-operator.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- include "ai-operators.kb-operator.fullname" . }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Agent Operator service account name
*/}}
{{- define "ai-operators.agent-operator.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- include "ai-operators.agent-operator.fullname" . }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
