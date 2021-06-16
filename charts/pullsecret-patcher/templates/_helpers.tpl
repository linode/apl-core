{{/*
Expand the name of the chart.
*/}}
{{- define "pullsecret-patcher.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "pullsecret-patcher.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "pullsecret-patcher.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "pullsecret-patcher.labels" -}}
helm.sh/chart: {{ include "pullsecret-patcher.chart" . }}
{{ include "pullsecret-patcher.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "pullsecret-patcher.selectorLabels" -}}
app.kubernetes.io/name: {{ include "pullsecret-patcher.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "pullsecret-patcher.serviceAccountName" -}}
{{- if .Values.rbac.create }}
{{- default (include "pullsecret-patcher.fullname" .) .Values.rbac.serviceAccountName }}
{{- else }}
{{- default "default" .Values.rbac.serviceAccountName }}
{{- end }}
{{- end }}

{{/*
Create the docker pull secret from the creds
*/}}
{{- define "dockercfg" -}}
{"auths":{"{{ .server | default "docker.io" }}":{"username":"{{ .username }}","password":"{{ .password | replace "\"" "\\\"" }}","email":"{{ .email | default "not@us.ed" }}","auth":"{{ print .username ":" .password | b64enc}}"}}}
{{- end -}}
