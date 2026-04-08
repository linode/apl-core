{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "oauth2-proxy.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "oauth2-proxy.fullname" -}}
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
{{- define "oauth2-proxy.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Generate basic labels
*/}}
{{- define "oauth2-proxy.labels" }}
helm.sh/chart: {{ include "oauth2-proxy.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: authentication-proxy
app.kubernetes.io/part-of: {{ template "oauth2-proxy.name" . }}
{{- include "oauth2-proxy.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- if .Values.customLabels }}
{{ tpl (toYaml .Values.customLabels) $ }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "oauth2-proxy.selectorLabels" }}
app.kubernetes.io/name: {{ include "oauth2-proxy.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Get the secret name.
*/}}
{{- define "oauth2-proxy.secretName" -}}
{{- if .Values.config.existingSecret -}}
{{- printf "%s" (tpl .Values.config.existingSecret $) -}}
{{- else -}}
{{- printf "%s" (include "oauth2-proxy.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "oauth2-proxy.serviceAccountName" -}}
{{- if .Values.serviceAccount.enabled -}}
    {{ default (include "oauth2-proxy.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Allow the release namespace to be overridden for multi-namespace deployments in combined charts
*/}}
{{- define "oauth2-proxy.namespace" -}}
  {{- if .Values.namespaceOverride -}}
    {{- .Values.namespaceOverride -}}
  {{- else -}}
    {{- .Release.Namespace -}}
  {{- end -}}
{{- end -}}

{{/*
Redis subchart enabled check
*/}}
{{- define "oauth2-proxy.redis.enabled" -}}
  {{- eq (index .Values "redis-ha" "enabled") true -}}
{{- end -}}

{{/*
Redis subcharts fullname
*/}}
{{- define "oauth2-proxy.redis.fullname" -}}
{{- if eq (include "oauth2-proxy.redis.enabled" .) "true" -}}
{{- $redisValues := index .Values "redis-ha" | default dict -}}
{{- include "redis-ha.fullname" (dict "Chart" (dict "Name" "redis-ha") "Release" .Release "Values" $redisValues) -}}
{{- else -}}
{{ fail "attempting to use redis subcharts fullname, even though the subchart is not enabled. This will lead to misconfiguration" }}
{{- end -}}
{{- end -}}

{{/*
Compute the redis url if not set explicitly.
*/}}
{{- define "oauth2-proxy.redis.StandaloneUrl" -}}
{{- if .Values.sessionStorage.redis.standalone.connectionUrl -}}
{{ .Values.sessionStorage.redis.standalone.connectionUrl }}
{{- else if eq (include "oauth2-proxy.redis.enabled" .) "true" -}}
{{- $redisValues := index .Values "redis-ha" | default dict -}}
{{- printf "redis://%s:%.0f" (include "oauth2-proxy.redis.fullname" .) $redisValues.redis.port -}}
{{- else -}}
{{ fail "please set sessionStorage.redis.standalone.connectionUrl or enable the redis subchart via redis-ha.enabled" }}
{{- end -}}
{{- end -}}

{{/*
Returns the version
*/}}
{{- define "oauth2-proxy.version" -}}
{{ .Values.image.tag | default (printf "v%s" .Chart.AppVersion) }}
{{- end -}}

{{/*
Returns the kubectl version
Workaround for EKS https://github.com/aws/eks-distro/issues/1128
*/}}
{{- define "kubectl.version" -}}
{{- if .Values.initContainers.waitForRedis.kubectlVersion -}}
{{ .Values.initContainers.waitForRedis.kubectlVersion }}
{{- else -}}
{{- printf "%s.%s" .Capabilities.KubeVersion.Major (.Capabilities.KubeVersion.Minor | replace "+" "") -}}
{{- end -}}
{{- end -}}

{{- define "oauth2-proxy.alpha-config" -}}
---
server:
  BindAddress: '0.0.0.0:4180'
{{- if .Values.alphaConfig.serverConfigData }}
{{- toYaml .Values.alphaConfig.serverConfigData | nindent 2 }}
{{- end }}
{{- if .Values.metrics.enabled }}
metricsServer:
  BindAddress: '0.0.0.0:44180'
{{- if .Values.alphaConfig.metricsConfigData }}
{{- toYaml .Values.alphaConfig.metricsConfigData | nindent 2 }}
{{- end }}
{{- end }}
{{- if .Values.alphaConfig.configData }}
{{- toYaml .Values.alphaConfig.configData | nindent 0 }}
{{- end }}
{{- if .Values.alphaConfig.configFile }}
{{- tpl .Values.alphaConfig.configFile $ | nindent 0 }}
{{- end }}
{{- end -}}

{{/*
If `config.forceLegacyConfig=false`, the chart ignores both the `config.configFile` and `config.existingConfig` overrides and only generates a minimal necessary legacy config.
If `config.existingConfig` is set and `config.forceLegacyConfig=true`, the external ConfigMap is mounted into the mounted file.
If `config.configFile` is set and `config.forceLegacyConfig=true`, the chart renders that inline content into the mounted file.
*/}}
{{- define "oauth2-proxy.legacy-config.mode" -}}
{{- if and .Values.alphaConfig.enabled (not .Values.config.forceLegacyConfig) -}}
generated-alpha-compatible
{{- else if .Values.config.existingConfig -}}
existing-configmap
{{- else if .Values.config.configFile -}}
inline-custom
{{- else if .Values.alphaConfig.enabled -}}
generated-alpha-compatible
{{- else -}}
generated-legacy
{{- end -}}
{{- end -}}

{{- define "oauth2-proxy.legacy-config.name" -}}
{{- if eq (include "oauth2-proxy.legacy-config.mode" .) "existing-configmap" -}}
{{- .Values.config.existingConfig -}}
{{- else -}}
{{- template "oauth2-proxy.fullname" . -}}
{{- end -}}
{{- end -}}

{{- define "oauth2-proxy.legacy-config.content" -}}
{{- if eq (include "oauth2-proxy.legacy-config.mode" .) "inline-custom" -}}
{{- tpl .Values.config.configFile $ -}}
{{- else if eq (include "oauth2-proxy.legacy-config.mode" .) "generated-alpha-compatible" -}}
email_domains = {{ .Values.config.emailDomains | toJson }}
{{- else -}}
email_domains = {{ .Values.config.emailDomains | toJson }}
upstreams = {{ .Values.config.upstreams | toJson }}
{{- end -}}
{{- end -}}

{{- define "oauth2-proxy.secrets" -}}
{{- if has "cookie-secret" .Values.config.requiredSecretKeys }}
cookie-secret: {{ tpl .Values.config.cookieSecret $ | b64enc | quote }}
{{- end }}
{{- if has "client-secret" .Values.config.requiredSecretKeys }}
client-secret: {{ tpl .Values.config.clientSecret $ | b64enc | quote }}
{{- end }}
{{- if has "client-id" .Values.config.requiredSecretKeys }}
client-id: {{ tpl .Values.config.clientID $ | b64enc | quote }}
{{- end }}
{{- end -}}
