{{/* vim: set filetype=mustache: */}}
{{/* Expand the name of the chart. */}}
{{- define "tekton-dashboard.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 50 | trimSuffix "-" -}}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
The components in this chart create additional resources that expand the longest created name strings.
The longest name that gets created adds and extra 37 characters, so truncation should be 63-35=26.
*/}}
{{- define "tekton-dashboard.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 26 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 26 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 26 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "tekton-dashboard.svcname" -}}
{{- if .Values.teamId -}}
{{- printf "%s-%s" .Values.teamId "tekton-dashboard" | trunc 32 | trimSuffix "-" -}}
{{- else -}}
{{- printf "tekton-dashboard" -}}
{{- end -}}
{{- end -}}

{{/* Generate basic labels */}}
{{- define "tekton-dashboard.labels" }}
app: tekton-dashboard
app.kubernetes.io/component: dashboard
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/name: dashboard
app.kubernetes.io/version: "{{ replace "+" "_" .Chart.Version }}"
dashboard.tekton.dev/release: "{{ replace "+" "_" .Chart.Version }}"
version: "{{ replace "+" "_" .Chart.Version }}"
rbac.dashboard.tekton.dev/subject: tekton-dashboard
app.kubernetes.io/part-of: {{ .Release.Name }}
{{- end }}

{{/* Generate selector labels */}}
{{- define "tekton-dashboard.selector-labels" }}
app: tekton-dashboard
app.kubernetes.io/component: dashboard
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/name: dashboard
app.kubernetes.io/part-of: {{ .Release.Name }}
{{- end }}