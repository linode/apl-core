{{/* vim: set filetype=mustache: */}}
{{/*
Name of the chart.
*/}}
{{- define "kubeclarity.name" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name -}}
{{- end -}}

{{- define "kubeclarity.sbom-db.name" -}}
{{- printf "%s-%s-sbom-db" .Release.Name .Chart.Name -}}
{{- end -}}

{{- define "kubeclarity.grype-server.name" -}}
{{- printf "%s-%s-grype-server" .Release.Name .Chart.Name -}}
{{- end -}}

{{/*
Helm labels.
*/}}
{{- define "kubeclarity.labels" -}}
    app.kubernetes.io/name: {{ include "kubeclarity.name" . }}
    app.kubernetes.io/managed-by: {{ .Release.Service }}
    app.kubernetes.io/instance: {{ .Release.Name }}
    helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "kubeclarity.sbom-db.labels" -}}
    app.kubernetes.io/name: {{ include "kubeclarity.sbom-db.name" . }}
    app.kubernetes.io/managed-by: {{ .Release.Service }}
    app.kubernetes.io/instance: {{ .Release.Name }}
    helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "kubeclarity.grype-server.labels" -}}
    app.kubernetes.io/name: {{ include "kubeclarity.grype-server.name" . }}
    app.kubernetes.io/managed-by: {{ .Release.Service }}
    app.kubernetes.io/instance: {{ .Release.Name }}
    helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}
