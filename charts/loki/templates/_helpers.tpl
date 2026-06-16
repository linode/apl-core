{{/*
Enforce valid label value.
See https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set
*/}}
{{- define "loki.validLabelValue" -}}
{{- (regexReplaceAllLiteral "[^a-zA-Z0-9._-]" . "-") | trunc 63 | trimSuffix "-" | trimSuffix "_" | trimSuffix "." }}
{{- end }}

{{/*
Safely convert a value to int with fallback.

Accepts int, float64 (e.g. 15.0), or numeric strings (e.g. "15").
Falls back to default for invalid values (e.g. "abc", nil).

Usage:
  {{ include "loki.safeInt" (dict "value" $v "default" 30) }}

Args:
  value: input value to convert
  default: fallback integer if value is invalid
*/}}
{{- define "loki.safeInt" -}}
{{- $v := index . "value" -}}
{{- $default := index . "default" -}}

{{- if or
  (kindIs "int" $v)
  (kindIs "float64" $v)
  (and (kindIs "string" $v) (eq (toString (toString $v | int)) $v))
}}
  {{- toString $v | int -}}
{{- else -}}
  {{- $default -}}
{{- end -}}
{{- end -}}

{{/*
Expand the name of the chart.
*/}}
{{- define "loki.name" -}}
{{- $name := .Chart.Name }}
{{- if .Values.nameOverride }}
{{- $name = (tpl .Values.nameOverride $) }}
{{- end }}
{{- $name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Allow the release namespace to be overridden for multi-namespace deployments in combined charts
*/}}
{{- define "loki.namespace" -}}
  {{- if .Values.namespaceOverride -}}
    {{- .Values.namespaceOverride -}}
  {{- else -}}
    {{- .Release.Namespace -}}
  {{- end -}}
{{- end -}}

{{/*
Resource workload name template
Params:
  ctx = . context
  componentValues = component values
  component = component name (optional)
  rolloutZoneName = rollout zone name (optional)
  suffix = component suffix (optional)
*/}}
{{- define "loki.workloadResourceName" -}}
{{- (tpl (.componentValues.fullnameOverride | default "") .ctx) | default (include "loki.resourceName" .) }}
{{- end -}}

{{/*
Resource name template
Params:
  ctx = . context
  component = component name (optional)
  rolloutZoneName = rollout zone name (optional)
  suffix = component suffix (optional)
*/}}
{{- define "loki.resourceName" -}}
{{- $resourceName := include "loki.fullname" .ctx -}}
{{- if .component -}}{{- $resourceName = printf "%s-%s" $resourceName .component -}}{{- end -}}
{{- if and (not .component) .rolloutZoneName -}}{{- printf "Component name cannot be empty if rolloutZoneName (%s) is set" .rolloutZoneName | fail -}}{{- end -}}
{{- if .rolloutZoneName -}}{{- $resourceName = printf "%s-%s" $resourceName .rolloutZoneName -}}{{- end -}}
{{- if .suffix -}}{{- $resourceName = printf "%s-%s" $resourceName .suffix -}}{{- end -}}
{{- $resourceName | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Return if deployment mode is simple scalable
*/}}
{{- define "loki.deployment.isScalable" -}}
  {{- and (eq (include "loki.isUsingObjectStorage" . ) "true") (or (eq .Values.deploymentMode "SingleBinary<->SimpleScalable")  (eq .Values.deploymentMode "Monolithic<->SimpleScalable") (eq .Values.deploymentMode "SimpleScalable") (eq .Values.deploymentMode "SimpleScalable<->Distributed")) }}
{{- end -}}

{{/*
Return if deployment mode is single binary
*/}}
{{- define "loki.deployment.isMonolithic" -}}
  {{- or (eq .Values.deploymentMode "SingleBinary") (eq .Values.deploymentMode "Monolithic") (eq .Values.deploymentMode "SingleBinary<->SimpleScalable") (eq .Values.deploymentMode "Monolithic<->SimpleScalable") }}
{{- end -}}

{{/*
Return if deployment mode is distributed
*/}}
{{- define "loki.deployment.isDistributed" -}}
  {{- and (eq (include "loki.isUsingObjectStorage" . ) "true") (or (eq .Values.deploymentMode "Distributed") (eq .Values.deploymentMode "SimpleScalable<->Distributed")) }}
{{- end -}}


{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "loki.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := include "loki.name" . }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Cluster label for rules and alerts.
*/}}
{{- define "loki.clusterLabel" -}}
{{- .Values.clusterLabelOverride | default (include "loki.fullname" .) | trunc 63 | trimSuffix "-" }}
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
{{- if or (.Chart.AppVersion) (.Values.loki.image.tag) }}
app.kubernetes.io/version: {{ include "loki.validLabelValue" (.Values.loki.image.tag | default .Chart.AppVersion) | quote }}
{{- end }}
{{- if .Values.commonLabels }}
{{ .Values.commonLabels | toYaml }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "loki.selectorLabels" -}}
app.kubernetes.io/name: {{ include "loki.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use.

Input parameters:
  ctx = root context for looking up values
  component = component name
  target = target context
*/}}
{{- define "loki.serviceAccountName" -}}
{{- if .component.serviceAccount.name }}
  {{- tpl .component.serviceAccount.name .ctx }}
{{- else if .component.serviceAccount.create -}}
  {{- include "loki.resourceName" (dict "ctx" .ctx "component" .target) }}
{{- else if .ctx.Values.serviceAccount.name }}
  {{- tpl .ctx.Values.serviceAccount.name .ctx }}
{{- else if .ctx.Values.serviceAccount.create -}}
  {{- include "loki.fullname" .ctx }}
{{- else -}}
  {{- "default" }}
{{- end -}}
{{- end -}}

{{/*
Base template for building docker image reference
Always prepends the registry when one is configured (global or service-level).
It also respects `.digest` as well as `.sha` (deprecated).

Parameters:
  ctx = . root context
  component = component name (optional)
  defaultVersion = default version to use if tag is not defined (optional)
  default = default image config to use if component config is not defined (optional)
*/}}
{{- define "loki.image" -}}
{{- $ctx := .ctx -}}
{{- $component := .component | default .service | default dict -}}
{{- $defaultVersion := .defaultVersion -}}
{{- $default := .default | default dict -}}
{{- $global := dict -}}
{{- if $ctx -}}
{{- $global = $ctx.Values.global | default dict -}}
{{- else -}}
{{- $global = .global | default dict -}}
{{- end -}}

{{- /* Resolve image source values with clear precedence. */ -}}
{{- $registry := coalesce $global.imageRegistry $global.image.registry $global.registry $component.registry $default.registry "" -}}
{{- $repository := coalesce $component.repository $default.repository "" -}}

{{- /* Prefer digest over tag, and support deprecated sha fallback. */ -}}
{{- $sha := coalesce $component.sha $default.sha "" -}}
{{- $shaRef := ternary (printf "@sha256:%s" $sha) "" (not (empty $sha)) -}}
{{- $digest := coalesce $component.digest $default.digest "" -}}
{{- $digestRef := ternary (printf "@%s" $digest) $shaRef (not (empty $digest)) -}}
{{- $tagRef := printf ":%s" (coalesce $component.tag $default.tag $defaultVersion | toString) -}}
{{- $ref := ternary $tagRef $digestRef (empty $digestRef) -}}

{{- $prefix := "" -}}
{{- if $registry -}}
{{- $prefix = printf "%s/" $registry -}}
{{- end -}}

{{- printf "%s%s%s" $prefix $repository $ref -}}
{{- end -}}

{{/*
Generated storage config for loki common config
*/}}
{{- define "loki.commonStorageConfig" -}}
{{- if .Values.loki.storage.use_thanos_objstore -}}
{{- $bucketName := required "Please define loki.storage.bucketNames.chunks" (dig "storage" "bucketNames" "chunks" "" .Values.loki) }}
object_store:
  {{- include "loki.thanosStorageConfig" (dict "ctx" . "bucketName" $bucketName) | nindent 2 }}
{{- else if .Values.minio.enabled -}}
s3:
  endpoint: {{ include "loki.minio" $ }}
  bucketnames: chunks
  secret_access_key: {{ $.Values.minio.rootPassword }}
  access_key_id: {{ $.Values.minio.rootUser }}
  s3forcepathstyle: true
  insecure: true
{{- else if (eq (include "loki.isUsingObjectStorage" . ) "true")  -}}
{{- $bucketName := "" }}
{{- if not (or (dig "aws" "s3" "" .Values.loki.storage_config) (dig "aws" "bucketnames" "" .Values.loki.storage_config)) -}}
{{- $bucketName = required "Please define loki.storage.bucketNames.chunks" (dig "storage" "bucketNames" "chunks" "" .Values.loki) }}
{{- end -}}
{{- include "loki.lokiStorageConfig" (dict "ctx" . "bucketName" $bucketName) | nindent 0 }}
{{- else if .Values.loki.storage.filesystem }}
filesystem:
  {{- toYaml .Values.loki.storage.filesystem | nindent 2 }}
{{- end -}}
{{- end -}}

{{/*
Storage config for ruler
*/}}
{{- define "loki.rulerStorageConfig" -}}
{{- if eq (dig "storage" "type" "" .Values.loki.rulerConfig) "local" -}}
type: "local"
{{- else if .Values.minio.enabled -}}
type: "s3"
s3:
  bucketnames: ruler
{{- else if (eq (include "loki.isUsingObjectStorage" . ) "true") }}
type: {{ .Values.loki.storage.type | quote }}
{{- $bucketName := required "Please define loki.storage.bucketNames.ruler" (dig "storage" "bucketNames" "ruler" "" .Values.loki) }}
{{- include "loki.lokiStorageConfig" (dict "ctx" . "bucketName" $bucketName) | nindent 0 }}
{{- else }}
type: "local"
{{- end }}
{{- end -}}


{{/*
Storage config
*/}}
{{- define "loki.lokiStorageConfig" -}}
{{- $bucketName := .bucketName }}
{{- if eq .ctx.Values.loki.storage.type "s3" -}}
s3:
{{- include "loki.lokiStorageConfig.s3" (dict "ctx" .ctx.Values.loki.storage.s3 "bucketName" $bucketName) | nindent 2 }}
{{- else if eq .ctx.Values.loki.storage.type "gcs" -}}
gcs:
{{- include "loki.lokiStorageConfig.gcs" (dict "ctx" .ctx.Values.loki.storage.gcs "bucketName" $bucketName) | nindent 2 }}
{{- else if eq .ctx.Values.loki.storage.type "azure" -}}
azure:
{{- include "loki.lokiStorageConfig.azure" (dict "ctx" .ctx.Values.loki.storage.azure "bucketName" $bucketName) | nindent 2 }}
{{- else if eq .ctx.Values.loki.storage.type "alibabacloud" -}}
{{- with .ctx.Values.loki.storage.alibabacloud }}
alibabacloud:
  {{- toYaml (mergeOverwrite dict
    (dict
      "bucket" $bucketName
      "access_key_id" .accessKeyId
      "secret_access_key" .secretAccessKey
    )
    (omit . "bucket" "accessKeyId" "secretAccessKey")
  ) | nindent 2 }}
{{- end -}}
{{- else if eq .ctx.Values.loki.storage.type "swift" -}}
{{- with .ctx.Values.loki.storage.swift }}
swift:
  container_name: {{ $bucketName }}
{{- toYaml (omit . "container_name") | nindent 2 }}
{{- end -}}
{{- else if eq .ctx.Values.loki.storage.type "bos" -}}
{{- with .ctx.Values.loki.storage.bos }}
bos:
  bucket_name: {{ $bucketName }}
{{- toYaml (omit . "bucketName") | nindent 2 }}
{{- end -}}
{{- else if eq .ctx.Values.loki.storage.type "cos" -}}
{{- with .ctx.Values.loki.storage.cos }}
cos:
  bucketnames: {{ $bucketName }}
{{- toYaml (omit . "bucketnames") | nindent 2 }}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Storage config S3
*/}}
{{- define "loki.lokiStorageConfig.s3" -}}
{{- $bucketName := .bucketName }}
{{- with .ctx }}
{{- mergeOverwrite
(dict
  "bucketnames" $bucketName
  "s3forcepathstyle" .s3ForcePathStyle
)
(omit . "bucketnames" "s3ForcePathStyle" "s3" "endpoint" "region" "secretAccessKey" "accessKeyId" "signatureVersion" "disable_dualstack" "http_config" "backoff_config" "sse")
| toYaml | nindent 0 }}
{{- with .s3 }}
s3: {{ . }}
{{- end }}
{{- with .endpoint }}
endpoint: {{ . }}
{{- end }}
{{- with .region }}
region: {{ . }}
{{- end}}
{{- with .secretAccessKey }}
secret_access_key: {{ . }}
{{- end }}
{{- with .accessKeyId }}
access_key_id: {{ . }}
{{- end }}
{{- with .signatureVersion }}
signature_version: {{ . }}
{{- end }}
{{- with .disable_dualstack }}
disable_dualstack: {{ . }}
{{- end }}
{{- with .http_config }}
http_config:
{{- toYaml . | nindent 4 }}
{{- end }}
{{- with .backoff_config }}
backoff_config:
{{- toYaml . | nindent 4 }}
{{- end }}
{{- with .sse }}
sse:
{{- toYaml . | nindent 4 }}
{{- end }}
{{- end }}
{{- end -}}

{{/*
Storage config GCS
*/}}
{{- define "loki.lokiStorageConfig.gcs" -}}
{{- $bucketName := .bucketName }}
{{- with .ctx }}
{{- mergeOverwrite (dict
  "bucket_name" $bucketName
  "chunk_buffer_size" .chunkBufferSize
  "request_timeout" .requestTimeout
  "enable_http2" .enableHttp2
) (omit . "bucket_name" "chunkBufferSize" "requestTimeout" "enableHttp2") | toYaml | nindent 0 }}
{{- end -}}
{{- end -}}

{{/*
Storage config Azure
*/}}
{{- define "loki.lokiStorageConfig.azure" -}}
{{- $bucketName := .bucketName }}
{{- with .ctx }}
{{- mergeOverwrite
(dict
  "container_name" $bucketName
  "account_name" .accountName
  "use_managed_identity" .useManagedIdentity
  "use_federated_token" .useFederatedToken
)
(omit . "accountName" "useManagedIdentity" "useFederatedToken" "accountKey" "connectionString" "userAssignedId" "requestTimeout" "endpointSuffix" "chunkDelimiter") | toYaml | nindent 0 }}
{{- with .accountKey }}
account_key: {{ . }}
{{- end }}
{{- with .connectionString }}
connection_string: {{ . }}
{{- end }}
{{- with .userAssignedId }}
user_assigned_id: {{ . }}
{{- end }}
{{- with .requestTimeout }}
request_timeout: {{ . }}
{{- end }}
{{- with .endpointSuffix }}
endpoint_suffix: {{ . }}
{{- end }}
{{- with .chunkDelimiter }}
chunk_delimiter: {{ . }}
{{- end }}
{{- end -}}
{{- end -}}

{{/* Loki ruler config */}}
{{- define "loki.rulerConfig" }}
ruler:
{{- mergeOverwrite (dict "storage" (include "loki.rulerStorageConfig" . | fromYaml)) (.Values.loki.rulerConfig | default dict) | toYaml | nindent 2 }}
{{- end }}

{{/* Ruler Thanos Storage Config */}}
{{- define "loki.rulerThanosStorageConfig" -}}
{{- if and .Values.loki.storage.use_thanos_objstore .Values.ruler.enabled}}
  backend: {{ .Values.loki.storage.object_store.type }}
  {{- $bucketName := required "Please define loki.storage.bucketNames.ruler" (dig "storage" "bucketNames" "ruler" "" .Values.loki) }}
  {{- include "loki.thanosStorageConfig" (dict "ctx" . "bucketName" $bucketName) | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Calculate the config from structured and unstructured text input
*/}}
{{- define "loki.calculatedConfig" -}}
{{ tpl (mergeOverwrite (tpl .Values.loki.config . | fromYaml) .Values.loki.structuredConfig | toYaml) . }}
{{- end }}

{{/*
The volume to mount for loki configuration
*/}}
{{- define "loki.configVolume" -}}
{{- if eq .Values.loki.configStorageType "Secret" -}}
secret:
  secretName: {{ tpl .Values.loki.configObjectName . }}
{{- else -}}
configMap:
  name: {{ tpl .Values.loki.configObjectName . }}
  items:
    - key: "config.yaml"
      path: "config.yaml"
{{- end -}}
{{- end -}}

{{- define "loki.memcached.suffix" -}}
{{- $suffix := default "" . -}}
{{ if ne $suffix "" }}-{{ $suffix }}{{ end }}
{{- end }}

{{/* Allow KubeVersion to be overridden. */}}
{{- define "loki.kubeVersion" -}}
  {{- default .Capabilities.KubeVersion.Version .Values.kubeVersionOverride -}}
{{- end -}}

{{/*
Generate list of ingress service paths based on deployment type
*/}}
{{- define "loki.ingress.servicePaths" -}}
{{- if (eq (include "loki.deployment.isMonolithic" .) "true") -}}
{{- include "loki.ingress.monolithicServicePaths" . }}
{{- else if (eq (include "loki.deployment.isDistributed" .) "true") -}}
{{- include "loki.ingress.distributedServicePaths" . }}
{{- else if (eq (include "loki.deployment.isScalable" .) "true") -}}
{{- include "loki.ingress.scalableServicePaths" . }}
{{- end -}}
{{- end -}}

{{/*
Ingress service paths for distributed deployment
*/}}
{{- define "loki.ingress.distributedServicePaths" -}}
{{- $distributorServiceName := include "loki.resourceName" (dict "ctx" . "component" "distributor") }}
{{- include "loki.ingress.servicePath" (dict "ctx" . "serviceName" $distributorServiceName "paths" .Values.ingress.paths.distributor )}}
{{- $queryFrontendServiceName := include "loki.resourceName" (dict "ctx" . "component" "query-frontend") }}
{{- include "loki.ingress.servicePath" (dict "ctx" . "serviceName" $queryFrontendServiceName "paths" .Values.ingress.paths.queryFrontend )}}
{{- $rulerServiceName := include "loki.resourceName" (dict "ctx" . "component" "ruler") }}
{{- include "loki.ingress.servicePath" (dict "ctx" . "serviceName" $rulerServiceName "paths" .Values.ingress.paths.ruler)}}
{{- $compactorServiceName := include "loki.resourceName" (dict "ctx" . "component" "compactor") }}
{{- include "loki.ingress.servicePath" (dict "ctx" . "serviceName" $compactorServiceName "paths" .Values.ingress.paths.compactor)}}
{{- end -}}

{{/*
Ingress service paths for simple scalable deployment when backend components were part of read component.
*/}}
{{- define "loki.ingress.scalableServicePaths" -}}
{{- $readServiceName := include "loki.resourceName" (dict "ctx" . "component" "read") }}
{{- include "loki.ingress.servicePath" (dict "ctx" . "serviceName" $readServiceName "paths" .Values.ingress.paths.queryFrontend )}}
{{- $writeServiceName := include "loki.resourceName" (dict "ctx" . "component" "write") }}
{{- include "loki.ingress.servicePath" (dict "ctx" . "serviceName" $writeServiceName "paths" .Values.ingress.paths.distributor )}}
{{- $backendServiceName := include "loki.resourceName" (dict "ctx" . "component" "backend") }}
{{- include "loki.ingress.servicePath" (dict "ctx" . "serviceName" $backendServiceName "paths" .Values.ingress.paths.ruler )}}
{{- include "loki.ingress.servicePath" (dict "ctx" . "serviceName" $backendServiceName "paths" .Values.ingress.paths.compactor )}}
{{- end -}}

{{/*
Ingress service paths for single binary deployment
*/}}
{{- define "loki.ingress.monolithicServicePaths" -}}
{{- $serviceName := include "loki.fullname" . }}
{{- include "loki.ingress.servicePath" (dict "ctx" . "serviceName" $serviceName "paths" .Values.ingress.paths.distributor )}}
{{- include "loki.ingress.servicePath" (dict "ctx" . "serviceName" $serviceName "paths" .Values.ingress.paths.queryFrontend )}}
{{- include "loki.ingress.servicePath" (dict "ctx" . "serviceName" $serviceName "paths" .Values.ingress.paths.ruler )}}
{{- include "loki.ingress.servicePath" (dict "ctx" . "serviceName" $serviceName "paths" .Values.ingress.paths.compactor )}}
{{- end -}}

{{/*
Ingress service path helper function
Params:
  ctx = . context
  serviceName = fully qualified k8s service name
  paths = list of url paths to allow ingress for
*/}}
{{- define "loki.ingress.servicePath" -}}
{{- range .paths }}
- path: {{ . }}
  pathType: Prefix
  backend:
    service:
      name: {{ $.serviceName }}
      port:
        number: {{ $.ctx.Values.loki.server.http_listen_port }}
{{- end -}}
{{- end -}}

{{/*
Create the service endpoint including port for MinIO.
*/}}
{{- define "loki.minio" -}}
{{- if .Values.minio.enabled -}}
{{- .Values.minio.address | default (printf "%s-%s.%s.svc:%s" .Release.Name "minio" (include "loki.namespace" .) (.Values.minio.service.port | toString)) -}}
{{- end -}}
{{- end -}}

{{/* Determine if deployment is using object storage */}}
{{- define "loki.isUsingObjectStorage" -}}
{{- has .Values.loki.storage.type (list "s3" "gcs" "azure" "swift" "alibabacloud" "cos" "bos") }}
{{- end -}}

{{/* Configure the correct name for the memberlist service */}}
{{- define "loki.memberlist" -}}
{{- if .Values.memberlist.service.name }}
{{- tpl .Values.memberlist.service.name . }}
{{- else }}
{{- include "loki.fullname" . }}-memberlist
{{- end -}}
{{- end -}}

{{/* Configure the correct name for the runtime config */}}
{{- define "loki.runtime.name" -}}
{{- include "loki.fullname" . }}-runtime
{{- end -}}

{{/* Determine the public host for the Loki cluster */}}
{{- define "loki.host" -}}
{{- $isMonolithic := eq (include "loki.deployment.isMonolithic" .) "true" -}}
{{- $url := printf "%s.%s.svc.%s.:%s" (include "loki.resourceName" (dict "ctx" . "component" "gateway")) (include "loki.namespace" .) .Values.global.clusterDomain (.Values.gateway.service.port | toString)  }}
{{- if and $isMonolithic (not .Values.gateway.enabled)  }}
  {{- $url = printf "%s.%s.svc.%s.:%s" (include "loki.fullname" .) (include "loki.namespace" .) .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}
{{- end }}
{{- printf "%s" $url -}}
{{- end -}}

{{/* Determine the public endpoint for the Loki cluster */}}
{{- define "loki.address" -}}
{{- printf "http://%s" (include "loki.host" . ) -}}
{{- end -}}

{{/* Snippet for the nginx file used by gateway */}}
{{- define "loki.nginxFile" -}}
worker_processes  5;  ## Default: 1
error_log  /dev/stderr;
pid        /tmp/nginx.pid;
worker_rlimit_nofile 8192;

events {
  worker_connections  4096;  ## Default: 1024
}

http {
  client_body_temp_path /tmp/client_temp;
  proxy_temp_path       /tmp/proxy_temp_path;
  fastcgi_temp_path     /tmp/fastcgi_temp;
  uwsgi_temp_path       /tmp/uwsgi_temp;
  scgi_temp_path        /tmp/scgi_temp;

  client_max_body_size  {{ .Values.gateway.nginxConfig.clientMaxBodySize }};

  proxy_read_timeout    600; ## 10 minutes
  proxy_send_timeout    600;
  proxy_connect_timeout 600;

  proxy_http_version    1.1;

  default_type application/octet-stream;
  log_format   {{ .Values.gateway.nginxConfig.logFormat }}

  {{- if .Values.gateway.metrics.enabled }}
  # Exclude specific requests from logging
  map $request_uri $track {
    default 1;
    ~^/$ 0;
    ~^/health 0;
    ~^/metrics 0;
  }

  # simple_upstream preset
  log_format access_log_exporter '$http_host\t$request_method\t$status\t$request_completion\t$request_time\t$request_length\t$bytes_sent\t$upstream_addr\t$upstream_connect_time\t$upstream_header_time\t$upstream_response_time\t$request_uri';
  access_log syslog:server=127.0.0.1:8514,nohostname access_log_exporter if=$track;
  {{- end }}
  {{- if .Values.gateway.verboseLogging }}
  access_log   /dev/stderr  main;
  {{- else }}

  map $status $loggable {
    ~^[23]  0;
    default 1;
  }
  access_log   /dev/stderr  main  if=$loggable;
  {{- end }}

  sendfile     on;
  tcp_nopush   on;
  {{- if .Values.gateway.nginxConfig.resolver }}
  resolver {{ .Values.gateway.nginxConfig.resolver }};
  {{- else }}
  resolver {{ .Values.global.dnsService }}.{{ .Values.global.dnsNamespace }}.svc.{{ .Values.global.clusterDomain }}.;
  {{- end }}

  {{- with .Values.gateway.nginxConfig.httpSnippet }}
  {{- tpl . $ | nindent 2 }}
  {{- end }}

  # if the X-Query-Tags header is empty, set a noop= without a value as empty values are not logged
  map $http_x_query_tags $query_tags {
    ""        "noop=";            # When header is empty, set noop=
    default   $http_x_query_tags; # Otherwise, preserve the original value
  }

  server {
    {{- if .Values.gateway.nginxConfig.ssl }}
    listen             {{ .Values.gateway.containerPort }} ssl;
    {{- if .Values.gateway.nginxConfig.enableIPv6 }}
    listen             [::]:{{ .Values.gateway.containerPort }} ssl;
    {{- end }}
    {{- else }}
    listen             {{ .Values.gateway.containerPort }};
    {{- if .Values.gateway.nginxConfig.enableIPv6 }}
    listen             [::]:{{ .Values.gateway.containerPort }};
    {{- end }}
    {{- end }}

    {{- if .Values.gateway.basicAuth.enabled }}
    auth_basic           "Loki";
    auth_basic_user_file /etc/nginx/secrets/.htpasswd;
    {{- end }}

    location = / {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      return 200 'OK';
      auth_basic off;
    }

    location = /stub_status {
      stub_status on;
      satisfy any;
      access_log off;
      allow 127.0.0.1;
      deny all;
      server_tokens on;  # expose nginx version
    }

    ########################################################
    # Configure backend targets

    {{- $namespace := include "loki.namespace" . }}
    {{- $backendHost := include "loki.resourceName" (dict "ctx" . "component" "backend") }}
    {{- $readHost := include "loki.resourceName" (dict "ctx" . "component" "read") }}
    {{- $writeHost := include "loki.resourceName" (dict "ctx" . "component" "write") }}

    {{- $httpSchema := .Values.gateway.nginxConfig.schema }}

    {{- $writeUrl    := printf "%s://%s.%s.svc.%s:%s" $httpSchema $writeHost   $namespace .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}
    {{- $readUrl     := printf "%s://%s.%s.svc.%s:%s" $httpSchema $readHost    $namespace .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}
    {{- $backendUrl  := printf "%s://%s.%s.svc.%s:%s" $httpSchema $backendHost $namespace .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}

    {{- if .Values.gateway.nginxConfig.customWriteUrl }}
    {{- $writeUrl  = .Values.gateway.nginxConfig.customWriteUrl }}
    {{- end }}
    {{- if .Values.gateway.nginxConfig.customReadUrl }}
    {{- $readUrl = .Values.gateway.nginxConfig.customReadUrl }}
    {{- end }}
    {{- if .Values.gateway.nginxConfig.customBackendUrl }}
    {{- $backendUrl = .Values.gateway.nginxConfig.customBackendUrl }}
    {{- end }}

    {{- $monolithicHost := include "loki.fullname" . }}
    {{- $monolithicUrl  := printf "%s://%s.%s.svc.%s:%s" $httpSchema $monolithicHost $namespace .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}

    {{- $distributorHost := include "loki.resourceName" (dict "ctx" . "component" "distributor") }}
    {{- $ingesterHost := include "loki.resourceName" (dict "ctx" . "component" "ingester") }}
    {{- $queryFrontendHost := include "loki.resourceName" (dict "ctx" . "component" "query-frontend") }}
    {{- $indexGatewayHost := include "loki.resourceName" (dict "ctx" . "component" "index-gateway") }}
    {{- $rulerHost := include "loki.resourceName" (dict "ctx" . "component" "ruler") }}
    {{- $compactorHost := include "loki.resourceName" (dict "ctx" . "component" "compactor") }}
    {{- $querySchedulerHost := include "loki.resourceName" (dict "ctx" . "component" "query-scheduler") }}
    {{- $querierHost := include "loki.resourceName" (dict "ctx" . "component" "querier") }}

    {{- $distributorUrl := printf "%s://%s.%s.svc.%s:%s" $httpSchema $distributorHost $namespace .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) -}}
    {{- $ingesterUrl := printf "%s://%s.%s.svc.%s:%s" $httpSchema $ingesterHost $namespace .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}
    {{- $queryFrontendUrl := printf "%s://%s.%s.svc.%s:%s" $httpSchema $queryFrontendHost $namespace .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}
    {{- $indexGatewayUrl := printf "%s://%s.%s.svc.%s:%s" $httpSchema $indexGatewayHost $namespace .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}
    {{- $rulerUrl := printf "%s://%s.%s.svc.%s:%s" $httpSchema $rulerHost $namespace .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}
    {{- $compactorUrl := printf "%s://%s.%s.svc.%s:%s" $httpSchema $compactorHost $namespace .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}
    {{- $querySchedulerUrl := printf "%s://%s.%s.svc.%s:%s" $httpSchema $querySchedulerHost $namespace .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}
    {{- $querierUrl := printf "%s://%s.%s.svc.%s:%s" $httpSchema $querierHost $namespace .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}

    {{- if eq (include "loki.deployment.isMonolithic" .) "true"}}
    {{- $distributorUrl = $monolithicUrl }}
    {{- $ingesterUrl = $monolithicUrl }}
    {{- $queryFrontendUrl = $monolithicUrl }}
    {{- $indexGatewayUrl = $monolithicUrl }}
    {{- $rulerUrl = $monolithicUrl }}
    {{- $compactorUrl = $monolithicUrl }}
    {{- $querySchedulerUrl = $monolithicUrl }}
    {{- $querierUrl = $monolithicUrl }}
    {{- else if eq (include "loki.deployment.isScalable" .) "true"}}
    {{- $distributorUrl = $writeUrl }}
    {{- $ingesterUrl = $writeUrl }}
    {{- $queryFrontendUrl = $readUrl }}
    {{- $querierUrl = $readUrl }}
    {{- $indexGatewayUrl = $backendUrl }}
    {{- $rulerUrl = $backendUrl }}
    {{- $compactorUrl = $backendUrl }}
    {{- $querySchedulerUrl = $backendUrl }}
    {{- end -}}

    {{- if .Values.loki.ui.gateway.enabled }}
    location ^~ /ui {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $querierUrl }}";
      proxy_pass       $backend$request_uri;
    }
    {{- end }}

    # Distributor
    location = /api/prom/push {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $distributorUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /loki/api/v1/push {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $distributorUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /distributor/ring {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $distributorUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /otlp/v1/logs {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $distributorUrl }}";
      proxy_pass       $backend$request_uri;
    }

    # Ingester
    location = /flush {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $ingesterUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location ^~ /ingester/ {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $ingesterUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /ingester {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      internal;        # to suppress 301
    }

    # Ring
    location = /ring {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $ingesterUrl }}";
      proxy_pass       $backend$request_uri;
    }

    # MemberListKV
    location = /memberlist {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $ingesterUrl }}";
      proxy_pass       $backend$request_uri;
    }

    # Ruler
    location = /ruler/ring {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $rulerUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /api/prom/rules {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $rulerUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location ^~ /api/prom/rules/ {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $rulerUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /loki/api/v1/rules {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $rulerUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location ^~ /loki/api/v1/rules/ {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $rulerUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /prometheus/api/v1/alerts {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $rulerUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /prometheus/api/v1/rules {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $rulerUrl }}";
      proxy_pass       $backend$request_uri;
    }

    # Compactor
    location = /compactor/ring {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $compactorUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /loki/api/v1/delete {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $compactorUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /loki/api/v1/cache/generation_numbers {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $compactorUrl }}";
      proxy_pass       $backend$request_uri;
    }

    # IndexGateway
    location = /indexgateway/ring {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $indexGatewayUrl }}";
      proxy_pass       $backend$request_uri;
    }

    # QueryScheduler
    location = /scheduler/ring {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $querySchedulerUrl }}";
      proxy_pass       $backend$request_uri;
    }

    # Config
    location = /config {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $ingesterUrl }}";
      proxy_pass       $backend$request_uri;
    }

    # QueryFrontend, Querier
    location = /api/prom/tail {
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $queryFrontendUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /loki/api/v1/tail {
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $queryFrontendUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location ^~ /api/prom/ {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $queryFrontendUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /api/prom {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      internal;        # to suppress 301
    }
    location ^~ /loki/api/v1/ {
      # pass custom headers set by Grafana as X-Query-Tags which are logged as key/value pairs in metrics.go log messages
      proxy_set_header X-Query-Tags "${query_tags},user=${http_x_grafana_user},dashboard_id=${http_x_dashboard_uid},dashboard_title=${http_x_dashboard_title},panel_id=${http_x_panel_id},panel_title=${http_x_panel_title},source_rule_uid=${http_x_rule_uid},rule_name=${http_x_rule_name},rule_folder=${http_x_rule_folder},rule_version=${http_x_rule_version},rule_source=${http_x_rule_source},rule_type=${http_x_rule_type}";
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      set $backend     "{{ $queryFrontendUrl }}";
      proxy_pass       $backend$request_uri;
    }
    location = /loki/api/v1 {
      {{- with .Values.gateway.nginxConfig.locationSnippet }}
      {{- tpl . $ | nindent 6 }}
      {{- end }}
      internal;        # to suppress 301
    }

    {{- with .Values.gateway.nginxConfig.serverSnippet }}
    {{ . | nindent 4 }}
    {{- end }}
  }
}
{{- end }}

{{/*
Resolve enableServiceLinks for a component using three-level cascade.
Accepts (dict "component" ... "ctx" .).
Returns "enableServiceLinks: <bool>" or empty string when unset at all levels.
*/}}
{{- define "loki.enableServiceLinks" -}}
{{- $component := .component -}}
{{- $ctx := .ctx -}}
{{- if (kindIs "bool" $component.enableServiceLinks) -}}
enableServiceLinks: {{ $component.enableServiceLinks }}
{{- else if (kindIs "bool" $ctx.Values.defaults.enableServiceLinks) -}}
enableServiceLinks: {{ $ctx.Values.defaults.enableServiceLinks }}
{{- else if (kindIs "bool" $ctx.Values.loki.enableServiceLinks) -}}
enableServiceLinks: {{ $ctx.Values.loki.enableServiceLinks }}
{{- end -}}
{{- end -}}

{{/* Determine compactor address based on target configuration */}}
{{- define "loki.compactorAddress" -}}
{{- $isSimpleScalable := eq (include "loki.deployment.isScalable" .) "true" -}}
{{- $isDistributed := eq (include "loki.deployment.isDistributed" .) "true" -}}
{{- $isMonolithic := eq (include "loki.deployment.isMonolithic" .) "true" -}}
{{- $compactorAddress := include "loki.resourceName" (dict "ctx" . "component" "backend") -}}
{{- if $isMonolithic -}}
{{/* single binary */}}
{{- $compactorAddress = include "loki.fullname" . -}}
{{/* distributed */}}
{{- else if $isDistributed -}}
{{- $compactorAddress = include "loki.resourceName" (dict "ctx" . "component" "compactor") -}}
{{- end -}}
{{- printf "%s.%s.svc.%s:%s" $compactorAddress (include "loki.namespace" .) .Values.global.clusterDomain (.Values.loki.server.grpc_listen_port | toString) }}
{{- end }}

{{/* Determine query-scheduler address */}}
{{- define "loki.querySchedulerAddress" -}}
{{- $querySchedulerAddress := ""}}
{{- $isDistributed := eq (include "loki.deployment.isDistributed" .) "true" -}}
{{- if $isDistributed -}}
{{- $querySchedulerAddress = printf "%s-headless.%s.svc.%s:%s" (include "loki.resourceName" (dict "ctx" . "component" "query-scheduler")) (include "loki.namespace" .) .Values.global.clusterDomain (.Values.loki.server.grpc_listen_port | toString) -}}
{{- end -}}
{{- printf "%s" $querySchedulerAddress }}
{{- end }}

{{/* Determine querier address */}}
{{- define "loki.querierAddress" -}}
{{- $querierAddress := "" }}
{{- $isDistributed := eq (include "loki.deployment.isDistributed" .) "true" -}}
{{- if $isDistributed -}}
{{- $querierHost := include "loki.resourceName" (dict "ctx" . "component" "querier")}}
{{- $querierUrl := printf "http://%s.%s.svc.%s:%s" $querierHost (include "loki.namespace" .) .Values.global.clusterDomain (.Values.loki.server.http_listen_port | toString) }}
{{- $querierAddress = $querierUrl }}
{{- end -}}
{{- printf "%s" $querierAddress }}
{{- end }}

{{/* Determine index-gateway address */}}
{{- define "loki.indexGatewayAddress" -}}
{{- $idxGatewayAddress := ""}}
{{- $isDistributed := eq (include "loki.deployment.isDistributed" .) "true" -}}
{{- $isScalable := eq (include "loki.deployment.isScalable" .) "true" -}}
{{- if $isDistributed -}}
{{- $idxGatewayAddress = printf "dns+%s-headless.%s.svc.%s:%s" (include "loki.resourceName" (dict "ctx" . "component" "index-gateway")) (include "loki.namespace" .) .Values.global.clusterDomain (.Values.loki.server.grpc_listen_port | toString) -}}
{{- end -}}
{{- if $isScalable -}}
{{- $idxGatewayAddress = printf "dns+%s-headless.%s.svc.%s:%s" (include "loki.resourceName" (dict "ctx" . "component" "backend")) (include "loki.namespace" .) .Values.global.clusterDomain (.Values.loki.server.grpc_listen_port | toString) -}}
{{- end -}}
{{- printf "%s" $idxGatewayAddress }}
{{- end }}

{{/* Determine bloom-planner address */}}
{{- define "loki.bloomPlannerAddress" -}}
{{- $bloomPlannerAddress := ""}}
{{- $isDistributed := eq (include "loki.deployment.isDistributed" .) "true" -}}
{{- $isScalable := eq (include "loki.deployment.isScalable" .) "true" -}}
{{- if $isDistributed -}}
{{- $bloomPlannerAddress = printf "%s-headless.%s.svc.%s:%s" (include "loki.resourceName" (dict "ctx" . "component" "bloom-planner")) (include "loki.namespace" .) .Values.global.clusterDomain (.Values.loki.server.grpc_listen_port | toString) -}}
{{- end -}}
{{- if $isScalable -}}
{{- $bloomPlannerAddress = printf "%s-headless.%s.svc.%s:%s" (include "loki.resourceName" (dict "ctx" . "component" "backend")) (include "loki.namespace" .) .Values.global.clusterDomain (.Values.loki.server.grpc_listen_port | toString) -}}
{{- end -}}
{{- printf "%s" $bloomPlannerAddress}}
{{- end }}

{{/* Determine bloom-gateway address */}}
{{- define "loki.bloomGatewayAddresses" -}}
{{- $bloomGatewayAddresses := ""}}
{{- $isDistributed := eq (include "loki.deployment.isDistributed" .) "true" -}}
{{- $isScalable := eq (include "loki.deployment.isScalable" .) "true" -}}
{{- if $isDistributed -}}
{{- $bloomGatewayAddresses = printf "dnssrvnoa+_grpc._tcp.%s-headless.%s.svc.%s" (include "loki.resourceName" (dict "ctx" . "component" "bloom-gateway")) (include "loki.namespace" .) .Values.global.clusterDomain -}}
{{- end -}}
{{- if $isScalable -}}
{{- $bloomGatewayAddresses = printf "dnssrvnoa+_grpc._tcp.%s-headless.%s.svc.%s" (include "loki.resourceName" (dict "ctx" . "component" "backend")) (include "loki.namespace" .) .Values.global.clusterDomain -}}
{{- end -}}
{{- printf "%s" $bloomGatewayAddresses}}
{{- end }}

{{- define "loki.config.checksum" -}}
checksum/config: {{ include "loki.configMapOrSecretContentHash" (dict "ctx" . "name" "/config.yaml") }}
{{- end -}}


{{/*
Return the object store type for use with the test schema.
*/}}
{{- define "loki.testSchemaObjectStore" -}}
  {{- if .Values.minio.enabled -}}
    s3
  {{- else -}}
    filesystem
  {{- end -}}
{{- end -}}

{{/*
compute a ConfigMap or Secret checksum only based on its .data content.
This function needs to be called with a context object containing the following keys:
- ctx: the current Helm context (what '.' is at the call site)
- name: the file name of the ConfigMap or Secret
*/}}
{{- define "loki.configMapOrSecretContentHash" -}}
{{ get (include (print .ctx.Template.BasePath .name) .ctx | fromYaml) "data" | toYaml | sha256sum }}
{{- end }}

{{/* Thanos object storage configuration helper to build
the thanos_storage_config model*/}}
{{- define "loki.thanosStorageConfig" -}}
{{- $bucketName := .bucketName }}
{{- with .ctx.Values.loki.storage.object_store }}
{{- if eq .type "s3" }}
s3:
{{- toYaml ( mergeOverwrite .s3 (dict "bucket_name" $bucketName) ) | nindent 2 }}
{{- else if eq .type "gcs" }}
gcs:
{{- toYaml ( mergeOverwrite .gcs (dict "bucket_name" $bucketName ) ) | nindent 2 }}
{{- else if eq .type "azure" }}
azure:
{{- toYaml ( mergeOverwrite .azure (dict "container_name" $bucketName ) ) | nindent 2 }}
{{- end }}
storage_prefix: {{ .storage_prefix }}
{{- end }}
{{- end }}

{{/*
Pod security context
*/}}
{{- define "loki.podSecurityContext" -}}
{{- toYaml .Values.loki.podSecurityContext }}
{{- end -}}

{{- define "loki.memoryToMiB" -}}
{{- $mem := . | toString -}}
{{- if hasSuffix "Ti" $mem -}}
  {{- mulf ((trimSuffix "Ti" $mem) | float64) 1048576 | int -}}
{{- else if hasSuffix "Gi" $mem -}}
  {{- mulf ((trimSuffix "Gi" $mem) | float64) 1024 | int -}}
{{- else if hasSuffix "Mi" $mem -}}
  {{- (trimSuffix "Mi" $mem) | int -}}
{{- else if hasSuffix "Ki" $mem -}}
  {{- divf ((trimSuffix "Ki" $mem) | float64) 1024 | int -}}
{{- else if hasSuffix "T" $mem -}}
  {{- mulf ((trimSuffix "T" $mem) | float64) 953674.3164 | int -}}
{{- else if hasSuffix "G" $mem -}}
  {{- mulf ((trimSuffix "G" $mem) | float64) 953.6743164 | int -}}
{{- else if hasSuffix "M" $mem -}}
  {{- mulf ((trimSuffix "M" $mem) | float64) 0.9536743164 | int -}}
{{- else -}}
  {{- divf ($mem | float64) 1048576 | int -}}
{{- end -}}
{{- end -}}

{{/*
Build the env block for a Loki component, auto-injecting GOMEMLIMIT and GOGC.

Arguments (passed as a dict):
  extraEnv  - already-concatenated extraEnv list for this component
  resources - the component's resources block (.Values.<component>.resources)
  factor    - fraction of memory limit for GOMEMLIMIT (default 0.85)
  gogc      - value for GOGC env var (default 80)

When the memory limit is not set, or GOMEMLIMIT is already defined in extraEnv,
the list is returned unchanged so users retain full control.
*/}}
{{- define "loki.componentEnv" -}}
{{- $envList := .extraEnv | default list -}}
{{- $resources := .resources | default dict -}}
{{- $factor := .factor | default 0.85 | float64 -}}
{{- $gogc := .gogc | default 80 | int -}}
{{- $hasGomemlimit := false -}}
{{- $hasGogc := false -}}
{{- range $envList -}}
  {{- if eq .name "GOMEMLIMIT" -}}{{- $hasGomemlimit = true -}}{{- end -}}
  {{- if eq .name "GOGC" -}}{{- $hasGogc = true -}}{{- end -}}
{{- end -}}
{{- $memLimit := dig "limits" "memory" "" $resources -}}
{{- if and (not $hasGomemlimit) $memLimit -}}
  {{- $mib := include "loki.memoryToMiB" $memLimit | int -}}
  {{- $goMemMib := mulf ($mib | float64) $factor | int -}}
  {{- $envList = append $envList (dict "name" "GOMEMLIMIT" "value" (printf "%dMiB" $goMemMib)) -}}
{{- end -}}
{{- if not $hasGogc -}}
  {{- $envList = append $envList (dict "name" "GOGC" "value" ($gogc | toString)) -}}
{{- end -}}
env:
  {{- with $envList | uniq }}
  {{- toYaml . | nindent 2 }}
  {{- end }}
  - name: POD_IP
    valueFrom:
      fieldRef:
        fieldPath: status.podIP
{{- end -}}

{{/*
format rules dir
*/}}
{{- define "loki.rulerRulesDirName" -}}
rules-{{ . | replace "_" "-" | trimSuffix "-" | lower }}
{{- end }}

{{/*
monolithic replicas calculation
*/}}
{{- define "loki.monolithicReplicas" -}}
{{- $replicas := 1 }}
{{- $usingObjectStorage := eq (include "loki.isUsingObjectStorage" .) "true" }}
{{- if and $usingObjectStorage (gt (int .Values.singleBinary.replicas) 1)}}
{{- $replicas = int .Values.singleBinary.replicas -}}
{{- end }}
{{- printf "%d" $replicas }}
{{- end }}
