{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "velero.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "velero.fullname" -}}
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
{{- define "velero.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create the name of the service account to use for creating or deleting the velero server
*/}}
{{- define "velero.serverServiceAccount" -}}
{{- if .Values.serviceAccount.server.create -}}
    {{ default (printf "%s-%s" (include "velero.fullname" .) "server") .Values.serviceAccount.server.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.server.name }}
{{- end -}}
{{- end -}}

{{/*
Create the name for the credentials secret.
*/}}
{{- define "velero.secretName" -}}
{{- if .Values.credentials.existingSecret -}}
  {{- .Values.credentials.existingSecret -}}
{{- else -}}
  {{ default (include "velero.fullname" .) .Values.credentials.name }}
{{- end -}}
{{- end -}}

{{/*
Create the Velero priority class name.
*/}}
{{- define "velero.priorityClassName" -}}
{{- if .Values.priorityClassName -}}
  {{- .Values.priorityClassName -}}
{{- else -}}
  {{- include "velero.fullname" . -}}
{{- end -}}
{{- end -}}

{{/*
Create the node-Agent priority class name.
*/}}
{{- define "velero.nodeAgent.priorityClassName" -}}
{{- if .Values.nodeAgent.priorityClassName -}}
  {{- .Values.nodeAgent.priorityClassName -}}
{{- else -}}
  {{- include "velero.fullname" . -}}
{{- end -}}
{{- end -}}

{{/*
Kubernetes version
Built-in object .Capabilities.KubeVersion.Minor can provide non-number output
For examples:
- on GKE it returns "18+" instead of "18"
- on EKS it returns "20+" instead of "20"
*/}}
{{- define "chart.KubernetesVersion" -}}
{{- $minorVersion := .Capabilities.KubeVersion.Minor | regexFind "[0-9]+" -}}
{{- printf "%s.%s" .Capabilities.KubeVersion.Major $minorVersion -}}
{{- end -}}


{{/*
Calculate the checksum of the credentials secret.
*/}}
{{- define "chart.config-checksum" -}}
{{- tpl (print .Values.credentials.secretContents .Values.credentials.extraEnvVars ) $ | sha256sum -}}
{{- end -}}
