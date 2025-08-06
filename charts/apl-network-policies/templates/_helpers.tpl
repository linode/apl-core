{{/*
Expand the name of the chart.
*/}}
{{- define "apl-network-policies.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "apl-network-policies.fullname" -}}
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
{{- define "apl-network-policies.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "apl-network-policies.labels" -}}
helm.sh/chart: {{ include "apl-network-policies.chart" . }}
{{ include "apl-network-policies.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "apl-network-policies.selectorLabels" -}}
app.kubernetes.io/name: {{ include "apl-network-policies.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Common platform namespace selectors
*/}}
{{- define "apl-network-policies.istioSystemSelector" -}}
- namespaceSelector:
    matchLabels:
      name: istio-system
{{- end }}

{{- define "apl-network-policies.monitoringSelector" -}}
- namespaceSelector:
    matchLabels:
      name: monitoring
  podSelector:
    matchLabels:
      app.kubernetes.io/instance: po-prometheus
{{- end }}

{{- define "apl-network-policies.aplOperatorSelector" -}}
- namespaceSelector:
    matchLabels:
      name: apl-operator
{{- end }}

{{- define "apl-network-policies.otomiSelector" -}}
- namespaceSelector:
    matchLabels:
      name: otomi
  podSelector:
    matchLabels:
      app.kubernetes.io/name: otomi-api
{{- end }}

{{- define "apl-network-policies.tektonGitCloneSelector" -}}
- namespaceSelector:
    matchLabels:
      type: team
  podSelector:
    matchLabels:
      tekton.dev/task: git-clone
{{- end }}