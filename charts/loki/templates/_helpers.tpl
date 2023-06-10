{{/*
Expand the name of the chart.
*/}}
{{- define "loki.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "loki.fullname" -}}
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
{{- define "loki.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "loki.labels" -}}
helm.sh/chart: {{ include "loki.chart" . }}
{{ include "loki.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "loki.selectorLabels" -}}
app.kubernetes.io/name: {{ include "loki.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "loki.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "loki.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Docker image name for Loki
*/}}
{{- define "loki.lokiImage" -}}
{{- $registry := coalesce .global.registry .service.registry .loki.registry -}}
{{- $repository := coalesce .service.repository .loki.repository -}}
{{- $tag := coalesce .service.tag .loki.tag .defaultVersion | toString -}}
{{- printf "%s/%s:%s" $registry $repository $tag -}}
{{- end -}}

{{/*
Docker image name
*/}}
{{- define "loki.image" -}}
{{- $registry := coalesce .global.registry .service.registry -}}
{{- $tag := .service.tag | toString -}}
{{- printf "%s/%s:%s" $registry .service.repository (.service.tag | toString) -}}
{{- end -}}

{{/*
Memcached Docker image
*/}}
{{- define "loki.memcachedImage" -}}
{{- $dict := dict "service" .Values.memcached.image "global" .Values.global.image -}}
{{- include "loki.image" $dict -}}
{{- end }}

{{/*
Memcached Exporter Docker image
*/}}
{{- define "loki.memcachedExporterImage" -}}
{{- $dict := dict "service" .Values.memcachedExporter.image "global" .Values.global.image -}}
{{- include "loki.image" $dict -}}
{{- end }}

{{/*
Return the appropriate apiVersion for ingress.
*/}}
{{- define "loki.ingress.apiVersion" -}}
  {{- if and (.Capabilities.APIVersions.Has "networking.k8s.io/v1") (semverCompare ">= 1.19-0" .Capabilities.KubeVersion.Version) -}}
    {{- print "networking.k8s.io/v1" -}}
  {{- else if .Capabilities.APIVersions.Has "networking.k8s.io/v1beta1" -}}
    {{- print "networking.k8s.io/v1beta1" -}}
  {{- else -}}
    {{- print "extensions/v1beta1" -}}
  {{- end -}}
{{- end -}}

{{/*
Return if ingress is stable.
*/}}
{{- define "loki.ingress.isStable" -}}
  {{- eq (include "loki.ingress.apiVersion" .) "networking.k8s.io/v1" -}}
{{- end -}}

{{/*
Return if ingress supports ingressClassName.
*/}}
{{- define "loki.ingress.supportsIngressClassName" -}}
  {{- or (eq (include "loki.ingress.isStable" .) "true") (and (eq (include "loki.ingress.apiVersion" .) "networking.k8s.io/v1beta1") (semverCompare ">= 1.18-0" .Capabilities.KubeVersion.Version)) -}}
{{- end -}}

{{/*
Return if ingress supports pathType.
*/}}
{{- define "loki.ingress.supportsPathType" -}}
  {{- or (eq (include "loki.ingress.isStable" .) "true") (and (eq (include "loki.ingress.apiVersion" .) "networking.k8s.io/v1beta1") (semverCompare ">= 1.18-0" .Capabilities.KubeVersion.Version)) -}}
{{- end -}}

{{/*
Return the appropriate apiVersion for PodDisruptionBudget.
*/}}
{{- define "loki.pdb.apiVersion" -}}
  {{- if and (.Capabilities.APIVersions.Has "policy/v1") (semverCompare ">=1.21-0" .Capabilities.KubeVersion.Version) -}}
    {{- print "policy/v1" -}}
  {{- else -}}
    {{- print "policy/v1beta1" -}}
  {{- end -}}
{{- end -}}

{{/*
Return the appropriate apiVersion for HorizontalPodAutoscaler.
*/}}
{{- define "loki.hpa.apiVersion" -}}
  {{- if and (.Capabilities.APIVersions.Has "autoscaling/v2") (semverCompare ">=1.23-0" .Capabilities.KubeVersion.Version) -}}
    {{- print "autoscaling/v2" -}}
  {{- else -}}
    {{- print "autoscaling/v2beta1" -}}
  {{- end -}}
{{- end -}}

{{- define "loki.ingester.readinessProbe" -}}
{{- with .Values.ingester.readinessProbe }}  
readinessProbe:
  {{- toYaml . | nindent 2 }}
{{- else }}
{{- with .Values.loki.readinessProbe }}
readinessProbe:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}
{{- end -}}

{{- define "loki.ingester.livenessProbe" -}}
{{- with .Values.ingester.livenessProbe }}
livenessProbe:
  {{- toYaml . | nindent 2 }}
{{- else }}
{{- with .Values.loki.livenessProbe }}
livenessProbe:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}
{{- end -}}

{{- define "loki.config.checksum" -}}
checksum/config: {{ tpl (mergeOverwrite (tpl .Values.loki.config . | fromYaml) .Values.loki.structuredConfig | toYaml) . | sha256sum }}
{{- end }}
