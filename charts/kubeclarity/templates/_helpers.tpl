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

{{- define "kubeclarity.trivy-server.name" -}}
{{- printf "%s-%s-trivy-server" .Release.Name .Chart.Name -}}
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

{{- define "kubeclarity.trivy-server.labels" -}}
    app.kubernetes.io/name: {{ include "kubeclarity.trivy-server.name" . }}
    app.kubernetes.io/managed-by: {{ .Release.Service }}
    app.kubernetes.io/instance: {{ .Release.Name }}
    helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{/*
Sets extra ingress annotations
*/}}
{{- define "kubeclarity.ingress.annotations" -}}
  {{- if .Values.kubeclarity.ingress.annotations }}
  annotations:
    {{- $tp := typeOf .Values.kubeclarity.ingress.annotations }}
    {{- if eq $tp "string" }}
      {{- tpl .Values.kubeclarity.ingress.annotations . | nindent 4 }}
    {{- else }}
      {{- toYaml .Values.kubeclarity.ingress.annotations | nindent 4 }}
    {{- end }}
  {{- end }}
{{- end -}}

{{/*
Sets extra Kubeclarity server Service annotations
*/}}
{{- define "kubeclarity.service.annotations" -}}
  {{- if .Values.kubeclarity.service.annotations }}
    {{- $tp := typeOf .Values.kubeclarity.service.annotations }}
    {{- if eq $tp "string" }}
      {{- tpl .Values.kubeclarity.service.annotations . | nindent 4 }}
    {{- else }}
      {{- toYaml .Values.kubeclarity.service.annotations | nindent 4 }}
    {{- end }}
  {{- end }}
{{- end -}}
