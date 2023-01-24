{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "falco-exporter.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "falco-exporter.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "falco-exporter.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "falco-exporter.labels" -}}
{{ include "falco-exporter.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- if not .Values.skipHelm }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
{{- if not .Values.skipHelm }}
helm.sh/chart: {{ include "falco-exporter.chart" . }}
{{- end }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "falco-exporter.selectorLabels" -}}
app.kubernetes.io/name: {{ include "falco-exporter.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "falco-exporter.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "falco-exporter.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Create the name of the PSP to use
*/}}
{{- define "falco-exporter.podSecurityPolicyName" -}}
{{- if .Values.podSecurityPolicy.create -}}
    {{ default (include "falco-exporter.fullname" .) .Values.podSecurityPolicy.name }}
{{- else -}}
    {{ default "default" .Values.podSecurityPolicy.name }}
{{- end -}}
{{- end -}}

{{/*
Extract the unixSocket's directory path
*/}}
{{- define "falco-exporter.unixSocketDir" -}}
{{- if .Values.falco.grpcUnixSocketPath -}}
{{- .Values.falco.grpcUnixSocketPath | trimPrefix "unix://" | dir -}}
{{- end -}}
{{- end -}}

{{/*
Return the appropriate apiVersion for rbac.
*/}}
{{- define "rbac.apiVersion" -}}
{{- if .Capabilities.APIVersions.Has "rbac.authorization.k8s.io/v1" }}
{{- print "rbac.authorization.k8s.io/v1" -}}
{{- else -}}
{{- print "rbac.authorization.k8s.io/v1beta1" -}}
{{- end -}}
{{- end -}}