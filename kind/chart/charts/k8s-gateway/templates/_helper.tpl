{{/*
Expand the name of the chart.
*/}}
{{- define "k8s-gateway.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "k8s-gateway.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "k8s-gateway.fullname" -}}
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
Create a default fully qualified controller name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "k8s-gateway.controller.fullname" -}}
{{- printf "%s-%s" (include "k8s-gateway.fullname" .) .Values.controller.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "k8s-gateway.labels" -}}
helm.sh/chart: {{ include "k8s-gateway.chart" . }}
{{ include "k8s-gateway.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "k8s-gateway.selectorLabels" -}}
app.kubernetes.io/name: {{ include "k8s-gateway.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the controller service account to use
*/}}
{{- define "k8s-gateway.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "k8s-gateway.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Create the "name" + "." + "namespace" fqdn
*/}}
{{- define "k8s-gateway.fqdn" -}}
{{- printf "%s.%s" (include "k8s-gateway.fullname" .) .Release.Namespace | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create the matchable regex from domain
*/}}
{{- define "k8s-gateway.regex" -}}
{{- if .Values.domain -}}
{{- .Values.domain | replace "." "[.]" -}}
{{- else -}}
    {{ "unset" }}
{{- end -}}
{{- end -}}