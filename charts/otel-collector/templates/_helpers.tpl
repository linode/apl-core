{{/*
Expand the name of the chart.
*/}}
{{- define "opentelemetry-collector.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "opentelemetry-collector.lowercase_chartname" -}}
{{- default .Chart.Name | lower }}
{{- end }}

{{/*
Get component name
*/}}
{{- define "opentelemetry-collector.component" -}}
{{- if eq .Values.mode "deployment" -}}
component: standalone-collector
{{- end -}}
{{- if eq .Values.mode "daemonset" -}}
component: agent-collector
{{- end -}}
{{- if eq .Values.mode "statefulset" -}}
component: statefulset-collector
{{- end -}}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "opentelemetry-collector.fullname" -}}
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
{{- define "opentelemetry-collector.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "opentelemetry-collector.labels" -}}
helm.sh/chart: {{ include "opentelemetry-collector.chart" . }}
{{ include "opentelemetry-collector.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "opentelemetry-collector.selectorLabels" -}}
app.kubernetes.io/name: {{ include "opentelemetry-collector.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "opentelemetry-collector.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "opentelemetry-collector.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}


{{/*
Create the name of the clusterRole to use
*/}}
{{- define "opentelemetry-collector.clusterRoleName" -}}
{{- default (include "opentelemetry-collector.fullname" .) .Values.clusterRole.name }}
{{- end }}

{{/*
Create the name of the clusterRoleBinding to use
*/}}
{{- define "opentelemetry-collector.clusterRoleBindingName" -}}
{{- default (include "opentelemetry-collector.fullname" .) .Values.clusterRole.clusterRoleBinding.name }}
{{- end }}

{{- define "opentelemetry-collector.podAnnotations" -}}
{{- if .Values.podAnnotations }}
{{- tpl (.Values.podAnnotations | toYaml) . }}
{{- end }}
{{- end }}

{{- define "opentelemetry-collector.podLabels" -}}
{{- if .Values.podLabels }}
{{- tpl (.Values.podLabels | toYaml) . }}
{{- end }}
{{- end }}

{{/*
Return the appropriate apiVersion for podDisruptionBudget.
*/}}
{{- define "podDisruptionBudget.apiVersion" -}}
  {{- if and (.Capabilities.APIVersions.Has "policy/v1") (semverCompare ">= 1.21-0" .Capabilities.KubeVersion.Version) -}}
    {{- print "policy/v1" -}}
  {{- else -}}
    {{- print "policy/v1beta1" -}}
  {{- end -}}
{{- end -}}


{{/*
Check if logs collection is enabled via deprecated "containerLogs" or "preset.logsCollection"
*/}}
{{- define "opentelemetry-collector.logsCollectionEnabled" }}
  {{- if eq (toString .Values.containerLogs) "<nil>" }}
    {{- print .Values.presets.logsCollection.enabled }}
  {{- else }}
    {{- print .Values.containerLogs.enabled }}
  {{- end }}
{{- end -}}


{{/*
Compute Service creation on mode
*/}}
{{- define "opentelemetry-collector.serviceEnabled" }}
  {{- $serviceEnabled := true -}}

  {{- if and (eq .Values.mode "daemonset") (not .Values.service.enabled) }}
    {{- $serviceEnabled = false -}}
  {{- end }}

  {{- print $serviceEnabled }}
{{- end -}}


{{/*
Compute InternalTrafficPolicy on Service creation
*/}}
{{- define "opentelemetry-collector.serviceInternalTrafficPolicy" }}
  {{- if and (eq .Values.mode "daemonset") (eq .Values.service.enabled true) }}
    {{- print (.Values.service.internalTrafficPolicy | default "Local") -}}
  {{- else }}
    {{- print (.Values.service.internalTrafficPolicy | default "Cluster") -}}
  {{- end }}
{{- end -}}


