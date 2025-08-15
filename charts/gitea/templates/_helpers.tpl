{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}

{{- define "gitea.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "gitea.fullname" -}}
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
Create a default worker name.
*/}}
{{- define "gitea.workername" -}}
{{- printf "%s-%s" .global.Release.Name .worker | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "gitea.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create image name and tag used by the deployment.
*/}}
{{- define "gitea.image" -}}
{{- $fullOverride := .Values.image.fullOverride | default "" -}}
{{- $registry := .Values.global.imageRegistry | default .Values.image.registry -}}
{{- $repository := .Values.image.repository -}}
{{- $separator := ":" -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion | toString -}}
{{- $rootless := ternary "-rootless" "" (.Values.image.rootless) -}}
{{- $digest := "" -}}
{{- if .Values.image.digest }}
    {{- $digest = (printf "@%s" (.Values.image.digest | toString)) -}}
{{- end -}}
{{- if $fullOverride }}
    {{- printf "%s" $fullOverride -}}
{{- else if $registry }}
    {{- printf "%s/%s%s%s%s%s" $registry $repository $separator $tag $rootless $digest -}}
{{- else -}}
    {{- printf "%s%s%s%s%s" $repository $separator $tag $rootless $digest -}}
{{- end -}}
{{- end -}}

{{/*
Docker Image Registry Secret Names evaluating values as templates
*/}}
{{- define "gitea.images.pullSecrets" -}}
{{- $pullSecrets := .Values.imagePullSecrets -}}
{{- range .Values.global.imagePullSecrets -}}
    {{- $pullSecrets = append $pullSecrets (dict "name" .) -}}
{{- end -}}
{{- if (not (empty $pullSecrets)) }}
imagePullSecrets:
{{ toYaml $pullSecrets }}
{{- end }}
{{- end -}}


{{/*
Storage Class
*/}}
{{- define "gitea.persistence.storageClass" -}}
{{- $storageClass :=  (tpl ( default "" .Values.persistence.storageClass) .) | default (tpl ( default "" .Values.global.storageClass) .) }}
{{- if $storageClass }}
storageClassName: {{ $storageClass | quote }}
{{- end }}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "gitea.labels" -}}
helm.sh/chart: {{ include "gitea.chart" . }}
app: {{ include "gitea.name" . }}
{{ include "gitea.selectorLabels" . }}
app.kubernetes.io/version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "gitea.labels.actRunner" -}}
helm.sh/chart: {{ include "gitea.chart" . }}
app: {{ include "gitea.name" . }}-act-runner
{{ include "gitea.selectorLabels.actRunner" . }}
app.kubernetes.io/version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "gitea.selectorLabels" -}}
app.kubernetes.io/name: {{ include "gitea.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "gitea.selectorLabels.actRunner" -}}
app.kubernetes.io/name: {{ include "gitea.name" . }}-act-runner
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "postgresql-ha.dns" -}}
{{- if (index .Values "postgresql-ha").enabled -}}
{{- printf "%s-postgresql-ha-pgpool.%s.svc.%s:%g" .Release.Name .Release.Namespace .Values.clusterDomain (index .Values "postgresql-ha" "service" "ports" "postgresql") -}}
{{- end -}}
{{- end -}}

{{- define "postgresql.dns" -}}
{{- if (index .Values "postgresql").enabled -}}
{{- printf "%s-postgresql.%s.svc.%s:%g" .Release.Name .Release.Namespace .Values.clusterDomain .Values.postgresql.global.postgresql.service.ports.postgresql -}}
{{- end -}}
{{- end -}}

{{- define "valkey.dns" -}}
{{- if and ((index .Values "valkey-cluster").enabled) ((index .Values "valkey").enabled) -}}
{{- fail "valkey and valkey-cluster cannot be enabled at the same time. Please only choose one." -}}
{{- else if (index .Values "valkey-cluster").enabled -}}
{{- printf "redis+cluster://:%s@%s-valkey-cluster-headless.%s.svc.%s:%g/0?pool_size=100&idle_timeout=180s&" (index .Values "valkey-cluster").global.valkey.password .Release.Name .Release.Namespace .Values.clusterDomain (index .Values "valkey-cluster").service.ports.valkey -}}
{{- else if (index .Values "valkey").enabled -}}
{{- printf "redis://:%s@%s-valkey-headless.%s.svc.%s:%g/0?pool_size=100&idle_timeout=180s&" (index .Values "valkey").global.valkey.password .Release.Name .Release.Namespace .Values.clusterDomain (index .Values "valkey").master.service.ports.valkey -}}
{{- end -}}
{{- end -}}

{{- define "valkey.port" -}}
{{- if (index .Values "valkey-cluster").enabled -}}
{{ (index .Values "valkey-cluster").service.ports.valkey }}
{{- else if (index .Values "valkey").enabled -}}
{{ (index .Values "valkey").master.service.ports.valkey }}
{{- end -}}
{{- end -}}

{{- define "valkey.servicename" -}}
{{- if (index .Values "valkey-cluster").enabled -}}
{{- printf "%s-valkey-cluster-headless.%s.svc.%s" .Release.Name .Release.Namespace .Values.clusterDomain -}}
{{- else if (index .Values "valkey").enabled -}}
{{- printf "%s-valkey-headless.%s.svc.%s" .Release.Name .Release.Namespace .Values.clusterDomain -}}
{{- end -}}
{{- end -}}

{{- define "gitea.default_domain" -}}
{{- printf "%s-http.%s.svc.%s" (include "gitea.fullname" .) .Release.Namespace .Values.clusterDomain -}}
{{- end -}}

{{- define "gitea.ldap_settings" -}}
{{- $idx := index . 0 }}
{{- $values := index . 1 }}

{{- if not (hasKey $values "bindDn") -}}
{{- $_ := set $values "bindDn" "" -}}
{{- end -}}

{{- if not (hasKey $values "bindPassword") -}}
{{- $_ := set $values "bindPassword" "" -}}
{{- end -}}

{{- $flags := list "notActive" "skipTlsVerify" "allowDeactivateAll" "synchronizeUsers" "attributesInBind" -}}
{{- range $key, $val := $values -}}
{{- if and (ne $key "enabled") (ne $key "existingSecret") -}}
{{- if eq $key "bindDn" -}}
{{- printf "--%s \"${GITEA_LDAP_BIND_DN_%d}\" " ($key | kebabcase) ($idx) -}}
{{- else if eq $key "bindPassword" -}}
{{- printf "--%s \"${GITEA_LDAP_PASSWORD_%d}\" " ($key | kebabcase) ($idx) -}}
{{- else if eq $key "port" -}}
{{- printf "--%s %d " $key ($val | int) -}}
{{- else if has $key $flags -}}
{{- printf "--%s " ($key | kebabcase) -}}
{{- else -}}
{{- printf "--%s %s " ($key | kebabcase) ($val | squote) -}}
{{- end -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "gitea.oauth_settings" -}}
{{- $idx := index . 0 }}
{{- $values := index . 1 }}

{{- if not (hasKey $values "key") -}}
{{- $_ := set $values "key" (printf "${GITEA_OAUTH_KEY_%d}" $idx) -}}
{{- end -}}

{{- if not (hasKey $values "secret") -}}
{{- $_ := set $values "secret" (printf "${GITEA_OAUTH_SECRET_%d}" $idx) -}}
{{- end -}}

{{- range $key, $val := $values -}}
{{- if ne $key "existingSecret" -}}
{{- printf "--%s %s " ($key | kebabcase) ($val | quote) -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "gitea.public_protocol" -}}
{{- if and .Values.ingress.enabled (gt (len .Values.ingress.tls) 0) -}}
https
{{- else -}}
{{ .Values.gitea.config.server.PROTOCOL }}
{{- end -}}
{{- end -}}

{{- define "gitea.inline_configuration" -}}
  {{- include "gitea.inline_configuration.init" . -}}
  {{- include "gitea.inline_configuration.defaults" . -}}

  {{- $generals := list -}}
  {{- $inlines := dict -}}

  {{- range $key, $value := .Values.gitea.config  }}
    {{- if kindIs "map" $value }}
      {{- if gt (len $value) 0 }}
        {{- $section := default list (get $inlines $key) -}}
        {{- range $n_key, $n_value := $value }}
          {{- $section = append $section (printf "%s=%v" $n_key $n_value) -}}
        {{- end }}
        {{- $_ := set $inlines $key (join "\n" $section) -}}
      {{- end -}}
    {{- else }}
      {{- if or (eq $key "APP_NAME") (eq $key "RUN_USER") (eq $key "RUN_MODE") -}}
        {{- $generals = append $generals (printf "%s=%s" $key $value) -}}
      {{- else -}}
        {{- (printf "Key %s cannot be on top level of configuration" $key) | fail -}}
      {{- end -}}

    {{- end }}
  {{- end }}

  {{- $_ := set $inlines "_generals_" (join "\n" $generals) -}}
  {{- toYaml $inlines -}}
{{- end -}}

{{- define "gitea.inline_configuration.init" -}}
  {{- if not (hasKey .Values.gitea.config "cache") -}}
    {{- $_ := set .Values.gitea.config "cache" dict -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config "server") -}}
    {{- $_ := set .Values.gitea.config "server" dict -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config "metrics") -}}
    {{- $_ := set .Values.gitea.config "metrics" dict -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config "database") -}}
    {{- $_ := set .Values.gitea.config "database" dict -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config "security") -}}
    {{- $_ := set .Values.gitea.config "security" dict -}}
  {{- end -}}
  {{- if not .Values.gitea.config.repository -}}
    {{- $_ := set .Values.gitea.config "repository" dict -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config "oauth2") -}}
    {{- $_ := set .Values.gitea.config "oauth2" dict -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config "session") -}}
    {{- $_ := set .Values.gitea.config "session" dict -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config "queue") -}}
    {{- $_ := set .Values.gitea.config "queue" dict -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config "queue.issue_indexer") -}}
    {{- $_ := set .Values.gitea.config "queue.issue_indexer" dict -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config "indexer") -}}
    {{- $_ := set .Values.gitea.config "indexer" dict -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config "actions") -}}
    {{- $_ := set .Values.gitea.config "actions" dict -}}
  {{- end -}}
{{- end -}}

{{- define "gitea.inline_configuration.defaults" -}}
  {{- include "gitea.inline_configuration.defaults.server" . -}}
  {{- include "gitea.inline_configuration.defaults.database" . -}}

  {{- if not .Values.gitea.config.repository.ROOT -}}
    {{- $_ := set .Values.gitea.config.repository "ROOT" "/data/git/gitea-repositories" -}}
  {{- end -}}
  {{- if not .Values.gitea.config.security.INSTALL_LOCK -}}
    {{- $_ := set .Values.gitea.config.security "INSTALL_LOCK" "true" -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config.metrics "ENABLED") -}}
    {{- $_ := set .Values.gitea.config.metrics "ENABLED" .Values.gitea.metrics.enabled -}}
  {{- end -}}
  {{- if and (not (hasKey .Values.gitea.config.metrics "TOKEN")) (.Values.gitea.metrics.token) (.Values.gitea.metrics.enabled) -}}
    {{- $_ := set .Values.gitea.config.metrics "TOKEN" .Values.gitea.metrics.token -}}
  {{- end -}}
  {{- /* valkey queue */ -}}
  {{- if or ((index .Values "valkey-cluster").enabled) ((index .Values "valkey").enabled) -}}
    {{- $_ := set .Values.gitea.config.queue "TYPE" "redis" -}}
    {{- $_ := set .Values.gitea.config.queue "CONN_STR" (include "valkey.dns" .) -}}
    {{- $_ := set .Values.gitea.config.session "PROVIDER" "redis" -}}
    {{- $_ := set .Values.gitea.config.session "PROVIDER_CONFIG" (include "valkey.dns" .) -}}
    {{- $_ := set .Values.gitea.config.cache "ADAPTER" "redis" -}}
    {{- $_ := set .Values.gitea.config.cache "HOST" (include "valkey.dns" .) -}}
  {{- else -}}
    {{- if not (get .Values.gitea.config.session "PROVIDER") -}}
      {{- $_ := set .Values.gitea.config.session "PROVIDER" "memory" -}}
    {{- end -}}
    {{- if not (get .Values.gitea.config.session "PROVIDER_CONFIG") -}}
      {{- $_ := set .Values.gitea.config.session "PROVIDER_CONFIG" "" -}}
    {{- end -}}
    {{- if not (get .Values.gitea.config.queue "TYPE") -}}
      {{- $_ := set .Values.gitea.config.queue "TYPE" "level" -}}
    {{- end -}}
    {{- if not (get .Values.gitea.config.queue "CONN_STR") -}}
      {{- $_ := set .Values.gitea.config.queue "CONN_STR" "" -}}
    {{- end -}}
    {{- if not (get .Values.gitea.config.cache "ADAPTER") -}}
      {{- $_ := set .Values.gitea.config.cache "ADAPTER" "memory" -}}
    {{- end -}}
    {{- if not (get .Values.gitea.config.cache "HOST") -}}
      {{- $_ := set .Values.gitea.config.cache "HOST" "" -}}
    {{- end -}}
  {{- end -}}
  {{- if not .Values.gitea.config.indexer.ISSUE_INDEXER_TYPE -}}
     {{- $_ := set .Values.gitea.config.indexer "ISSUE_INDEXER_TYPE" "db" -}}
  {{- end -}}
{{- end -}}

{{- define "gitea.inline_configuration.defaults.server" -}}
  {{- if not (hasKey .Values.gitea.config.server "HTTP_PORT") -}}
    {{- $_ := set .Values.gitea.config.server "HTTP_PORT" .Values.service.http.port -}}
  {{- end -}}
  {{- if not .Values.gitea.config.server.PROTOCOL -}}
    {{- $_ := set .Values.gitea.config.server "PROTOCOL" "http" -}}
  {{- end -}}
  {{- if not (.Values.gitea.config.server.DOMAIN) -}}
    {{- if gt (len .Values.ingress.hosts) 0 -}}
      {{- $_ := set .Values.gitea.config.server "DOMAIN" ( tpl (index .Values.ingress.hosts 0).host $) -}}
    {{- else -}}
      {{- $_ := set .Values.gitea.config.server "DOMAIN" (include "gitea.default_domain" .) -}}
    {{- end -}}
  {{- end -}}
  {{- if not .Values.gitea.config.server.ROOT_URL -}}
    {{- $_ := set .Values.gitea.config.server "ROOT_URL" (printf "%s://%s" (include "gitea.public_protocol" .) .Values.gitea.config.server.DOMAIN) -}}
  {{- end -}}
  {{- if not .Values.gitea.config.server.SSH_DOMAIN -}}
    {{- $_ := set .Values.gitea.config.server "SSH_DOMAIN" .Values.gitea.config.server.DOMAIN -}}
  {{- end -}}
  {{- if not .Values.gitea.config.server.SSH_PORT -}}
    {{- $_ := set .Values.gitea.config.server "SSH_PORT" .Values.service.ssh.port -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config.server "START_SSH_SERVER") -}}
    {{- if .Values.image.rootless -}}
      {{- $_ := set .Values.gitea.config.server "START_SSH_SERVER" "true" -}}
      {{- if not (hasKey .Values.gitea.config.server "SSH_LISTEN_PORT") -}}
        {{- if not .Values.gitea.config.server.SSH_LISTEN_PORT -}}
          {{- $_ := set .Values.gitea.config.server "SSH_LISTEN_PORT" .Values.gitea.config.server.SSH_PORT -}}
        {{- else -}}
          {{- $_ := set .Values.gitea.config.server "SSH_LISTEN_PORT" .Values.gitea.config.server.SSH_LISTEN_PORT -}}
        {{- end -}}
      {{- end -}}
    {{- else -}}
      {{- $_ := set .Values.gitea.config.server "START_SSH_SERVER" "false" -}}
    {{- end -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config.server "APP_DATA_PATH") -}}
    {{- $_ := set .Values.gitea.config.server "APP_DATA_PATH" "/data" -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config.server "ENABLE_PPROF") -}}
    {{- $_ := set .Values.gitea.config.server "ENABLE_PPROF" false -}}
  {{- end -}}
{{- end -}}

{{- define "gitea.inline_configuration.defaults.database" -}}
  {{- if (index .Values "postgresql-ha" "enabled") -}}
    {{- $_ := set .Values.gitea.config.database "DB_TYPE"   "postgres" -}}
    {{- if not (.Values.gitea.config.database.HOST) -}}
      {{- $_ := set .Values.gitea.config.database "HOST"      (include "postgresql-ha.dns" .) -}}
    {{- end -}}
    {{- $_ := set .Values.gitea.config.database "NAME"      (index .Values "postgresql-ha" "global" "postgresql" "database") -}}
    {{- $_ := set .Values.gitea.config.database "USER"      (index .Values "postgresql-ha" "global" "postgresql" "username") -}}
    {{- $_ := set .Values.gitea.config.database "PASSWD"    (index .Values "postgresql-ha" "global" "postgresql" "password") -}}
  {{- end -}}
  {{- if (index .Values "postgresql" "enabled") -}}
    {{- $_ := set .Values.gitea.config.database "DB_TYPE"   "postgres" -}}
    {{- if not (.Values.gitea.config.database.HOST) -}}
      {{- $_ := set .Values.gitea.config.database "HOST"      (include "postgresql.dns" .) -}}
    {{- end -}}
    {{- $_ := set .Values.gitea.config.database "NAME"      .Values.postgresql.global.postgresql.auth.database -}}
    {{- $_ := set .Values.gitea.config.database "USER"      .Values.postgresql.global.postgresql.auth.username -}}
    {{- $_ := set .Values.gitea.config.database "PASSWD"    .Values.postgresql.global.postgresql.auth.password -}}
  {{- end -}}
{{- end -}}

{{- define "gitea.init-additional-mounts" -}}
  {{- /* Honor the deprecated extraVolumeMounts variable when defined */ -}}
  {{- if gt (len .Values.extraInitVolumeMounts) 0 -}}
    {{- toYaml .Values.extraInitVolumeMounts -}}
  {{- else if gt (len .Values.extraVolumeMounts) 0 -}}
    {{- toYaml .Values.extraVolumeMounts -}}
  {{- end -}}
{{- end -}}

{{- define "gitea.container-additional-mounts" -}}
  {{- /* Honor the deprecated extraVolumeMounts variable when defined */ -}}
  {{- if gt (len .Values.extraContainerVolumeMounts) 0 -}}
    {{- toYaml .Values.extraContainerVolumeMounts -}}
  {{- else if gt (len .Values.extraVolumeMounts) 0 -}}
    {{- toYaml .Values.extraVolumeMounts -}}
  {{- end -}}
{{- end -}}

{{- define "gitea.gpg-key-secret-name" -}}
{{ default (printf "%s-gpg-key" (include "gitea.fullname" .)) .Values.signing.existingSecret }}
{{- end -}}

{{- define "gitea.serviceAccountName" -}}
{{ .Values.serviceAccount.name | default (include "gitea.fullname" .) }}
{{- end -}}

{{- define "ingress.annotations" -}}
  {{- if .Values.ingress.annotations }}
  annotations:
    {{- $tp := typeOf .Values.ingress.annotations }}
    {{- if eq $tp "string" }}
      {{- tpl .Values.ingress.annotations . | nindent 4 }}
    {{- else }}
      {{- toYaml .Values.ingress.annotations | nindent 4 }}
    {{- end }}
  {{- end }}
{{- end -}}

{{- define "gitea.admin.passwordMode" -}}
{{- if has .Values.gitea.admin.passwordMode (tuple "keepUpdated" "initialOnlyNoReset" "initialOnlyRequireReset") -}}
{{ .Values.gitea.admin.passwordMode }}
{{- else -}}
{{ printf "gitea.admin.passwordMode must be set to one of 'keepUpdated', 'initialOnlyNoReset', or 'initialOnlyRequireReset'. Received: '%s'" .Values.gitea.admin.passwordMode | fail }}
{{- end -}}
{{- end -}}

{{/* Create a functioning probe object for rendering. Given argument must be either a livenessProbe, readinessProbe, or startupProbe */}}
{{- define "gitea.deployment.probe" -}}
  {{- $probe := unset . "enabled" -}}
  {{- $probeKeys := keys $probe -}}
  {{- $containsCustomMethod := false -}}
  {{- $chartDefaultMethod := "tcpSocket" -}}
  {{- $nonChartDefaultMethods := list "exec" "httpGet" "grpc" -}}
  {{- range $probeKeys -}}
    {{- if has . $nonChartDefaultMethods -}}
      {{- $containsCustomMethod = true -}}
    {{- end -}}
  {{- end -}}
  {{- if $containsCustomMethod -}}
    {{- $probe = unset . $chartDefaultMethod -}}
  {{- end -}}
  {{- toYaml $probe -}}
{{- end -}}

{{- define "gitea.metrics-secret-name" -}}
{{ default (printf "%s-metrics-secret" (include "gitea.fullname" .)) }}
{{- end -}}
