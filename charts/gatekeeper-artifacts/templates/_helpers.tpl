{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "gatekeeper-artifacts.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "gatekeeper-artifacts.fullname" -}}
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
{{- define "gatekeeper-artifacts.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "gatekeeper-artifacts.labels" -}}
helm.sh/chart: {{ include "gatekeeper-artifacts.chart" . }}
{{ include "gatekeeper-artifacts.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "gatekeeper-artifacts.selectorLabels" -}}
app.kubernetes.io/name: {{ include "gatekeeper-artifacts.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "gatekeeper-artifacts.serviceAccountName" -}}
{{ include "gatekeeper-artifacts.fullname" . }}
{{- end -}}

{{- define "gatekeeper-artifacts.namespaces" -}}
{{- if gt (len .teamIds) 0 }}
  {{- if .excludedNamespaces }}
excludedNamespaces:
  {{- else }}
namespaces:
  {{- end }}
  {{- range $teamId := (.teamIds | sortAlpha) }}
  - team-{{ $teamId }}
  {{- end }}
{{- end -}}
{{- end -}}

{{- define "gatekeeper-artifacts.nodeselector-terms" -}}
nodeSelectorTerms:
  - matchExpressions:
      {{- range $key, $val := .labels }}
      - key: {{ $key }}
        operator: {{ $.operator | default "In" }}
        values:
          - {{ $val }}
      {{- end }}
{{- end -}}