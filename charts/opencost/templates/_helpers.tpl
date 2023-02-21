{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "opencost.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "opencost.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "opencost.fullname" -}}
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
Common labels
*/}}
{{- define "opencost.labels" -}}
helm.sh/chart: {{ include "opencost.chart" . }}
{{ include "opencost.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/part-of: {{ template "opencost.name" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if .Values.commonLabels}}
{{ toYaml .Values.commonLabels }}
{{- end }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "opencost.selectorLabels" -}}
app.kubernetes.io/name: {{ include "opencost.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Create the name of the controller service account to use
*/}}
{{- define "opencost.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "opencost.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Create the name of the controller service account to use
*/}}
{{- define "opencost.prometheusServerEndpoint" -}}
{{- if .Values.opencost.prometheus.external.enabled -}}
    {{ .Values.opencost.prometheus.external.url }}
{{- else -}}
    {{- $host := .Values.opencost.prometheus.internal.serviceName }}
    {{- $ns := .Values.opencost.prometheus.internal.namespaceName }}
    {{- $port := .Values.opencost.prometheus.internal.port | int }}
    {{- printf "http://%s.%s.svc:%d" $host $ns $port -}}
{{- end -}}
{{- end -}}


{{/*
Check that either prometheus external or internal is defined
*/}}
{{- define "isPrometheusConfigValid" -}}
{{- if and .Values.opencost.prometheus.external.enabled .Values.opencost.prometheus.internal.enabled -}}
        {{- fail "Only use one of the prometheus setups, internal or external" -}}
{{- end -}}
{{- end -}}
