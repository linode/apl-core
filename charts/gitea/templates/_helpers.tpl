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
Create chart name and version as used by the chart label.
*/}}
{{- define "gitea.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create image name and tag used by the deployment.
*/}}
{{- define "gitea.image" -}}
{{- $name := .Values.image.repository -}}
{{- $tag := ternary .Values.image.version .Values.image.tag (hasKey .Values.image "version") -}}
{{- $rootless := ternary "-rootless" "" (.Values.image.rootless) -}}
{{- printf "%s:%s%s" $name $tag $rootless -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "gitea.labels" -}}
helm.sh/chart: {{ include "gitea.chart" . }}
app: {{ include "gitea.name" . }}
{{ include "gitea.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "gitea.selectorLabels" -}}
app.kubernetes.io/name: {{ include "gitea.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "db.servicename" -}}
{{- if .Values.postgresql.enabled -}}
{{- printf "%s-postgresql" .Release.Name -}}
{{- else if .Values.mysql.enabled -}}
{{- printf "%s-mysql" .Release.Name -}}
{{- else if .Values.mariadb.enabled -}}
{{- printf "%s-mariadb" .Release.Name -}}
{{- else if ne .Values.gitea.config.database.DB_TYPE "sqlite3" -}}
{{- $parts := split ":" .Values.gitea.config.database.HOST -}}
{{- printf "%s %s" $parts._0 $parts._1 -}}
{{- end -}}
{{- end -}}

{{- define "db.port" -}}
{{- if .Values.postgresql.enabled -}}
{{ .Values.postgresql.global.postgresql.servicePort }}
{{- else if .Values.mysql.enabled -}}
{{ .Values.mysql.service.port }}
{{- else if .Values.mariadb.enabled -}}
{{ .Values.mariadb.primary.service.port }}
{{- else -}}
{{- end -}}
{{- end -}}

{{- define "postgresql.dns" -}}
{{- printf "%s-postgresql.%s.svc.%s:%g" .Release.Name .Release.Namespace .Values.clusterDomain .Values.postgresql.global.postgresql.servicePort -}}
{{- end -}}

{{- define "mysql.dns" -}}
{{- printf "%s-mysql.%s.svc.%s:%g" .Release.Name .Release.Namespace .Values.clusterDomain .Values.mysql.service.port | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "mariadb.dns" -}}
{{- printf "%s-mariadb.%s.svc.%s:%g" .Release.Name .Release.Namespace .Values.clusterDomain .Values.mariadb.primary.service.port | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "memcached.dns" -}}
{{- printf "%s-memcached.%s.svc.%s:%g" .Release.Name .Release.Namespace .Values.clusterDomain .Values.memcached.service.port | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "gitea.default_domain" -}}
{{- printf "%s-gitea.%s.svc.%s" (include "gitea.fullname" .) .Release.Namespace .Values.clusterDomain | trunc 63 | trimSuffix "-" -}}
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
  {{- if .Values.memcached.enabled -}}
    {{- $_ := set .Values.gitea.config.cache "ENABLED" "true" -}}
    {{- $_ := set .Values.gitea.config.cache "ADAPTER" "memcache" -}}
    {{- if not (.Values.gitea.config.cache.HOST) -}}
      {{- $_ := set .Values.gitea.config.cache "HOST" (include "memcached.dns" .) -}}
    {{- end -}}
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
      {{- $_ := set .Values.gitea.config.server "DOMAIN" (index .Values.ingress.hosts 0).host -}}
    {{- else -}}
      {{- $_ := set .Values.gitea.config.server "DOMAIN" (include "gitea.default_domain" .) -}}
    {{- end -}}
  {{- end -}}
  {{- if not .Values.gitea.config.server.ROOT_URL -}}
    {{- if .Values.ingress.enabled -}}
      {{- if gt (len .Values.ingress.tls) 0 -}}
        {{- $_ := set .Values.gitea.config.server "ROOT_URL" (printf "%s://%s" .Values.gitea.config.server.PROTOCOL (index (index .Values.ingress.tls 0).hosts 0)) -}}
      {{- else -}}
        {{- $_ := set .Values.gitea.config.server "ROOT_URL" (printf "%s://%s" .Values.gitea.config.server.PROTOCOL (index .Values.ingress.hosts 0).host) -}}
      {{- end -}}
    {{- else -}}
      {{- $_ := set .Values.gitea.config.server "ROOT_URL" (printf "%s://%s" .Values.gitea.config.server.PROTOCOL .Values.gitea.config.server.DOMAIN) -}}
    {{- end -}}
  {{- end -}}
  {{- if not .Values.gitea.config.server.SSH_DOMAIN -}}
    {{- $_ := set .Values.gitea.config.server "SSH_DOMAIN" .Values.gitea.config.server.DOMAIN -}}
  {{- end -}}
  {{- if not .Values.gitea.config.server.SSH_PORT -}}
    {{- $_ := set .Values.gitea.config.server "SSH_PORT" .Values.service.ssh.port -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config.server "SSH_LISTEN_PORT") -}}
    {{- if not .Values.image.rootless -}}
      {{- $_ := set .Values.gitea.config.server "SSH_LISTEN_PORT" .Values.gitea.config.server.SSH_PORT -}}
    {{- else -}}
      {{- $_ := set .Values.gitea.config.server "SSH_LISTEN_PORT" "2222" -}}
    {{- end -}}
  {{- end -}}
  {{- if not (hasKey .Values.gitea.config.server "START_SSH_SERVER") -}}
    {{- if .Values.image.rootless -}}
      {{- $_ := set .Values.gitea.config.server "START_SSH_SERVER" "true" -}}
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
  {{- if .Values.postgresql.enabled -}}
    {{- $_ := set .Values.gitea.config.database "DB_TYPE"   "postgres" -}}
    {{- if not (.Values.gitea.config.database.HOST) -}}
      {{- $_ := set .Values.gitea.config.database "HOST"      (include "postgresql.dns" .) -}}
    {{- end -}}
    {{- $_ := set .Values.gitea.config.database "NAME"      .Values.postgresql.global.postgresql.postgresqlDatabase -}}
    {{- $_ := set .Values.gitea.config.database "USER"      .Values.postgresql.global.postgresql.postgresqlUsername -}}
    {{- $_ := set .Values.gitea.config.database "PASSWD"    .Values.postgresql.global.postgresql.postgresqlPassword -}}
  {{- else if .Values.mysql.enabled -}}
    {{- $_ := set .Values.gitea.config.database "DB_TYPE"   "mysql" -}}
    {{- if not (.Values.gitea.config.database.HOST) -}}
      {{- $_ := set .Values.gitea.config.database "HOST"      (include "mysql.dns" .) -}}
    {{- end -}}
    {{- $_ := set .Values.gitea.config.database "NAME"      .Values.mysql.db.name -}}
    {{- $_ := set .Values.gitea.config.database "USER"      .Values.mysql.db.user -}}
    {{- $_ := set .Values.gitea.config.database "PASSWD"    .Values.mysql.db.password -}}
  {{- else if .Values.mariadb.enabled -}}
    {{- $_ := set .Values.gitea.config.database "DB_TYPE"   "mysql" -}}
    {{- if not (.Values.gitea.config.database.HOST) -}}
      {{- $_ := set .Values.gitea.config.database "HOST"      (include "mariadb.dns" .) -}}
    {{- end -}}
    {{- $_ := set .Values.gitea.config.database "NAME"      .Values.mariadb.auth.database -}}
    {{- $_ := set .Values.gitea.config.database "USER"      .Values.mariadb.auth.username -}}
    {{- $_ := set .Values.gitea.config.database "PASSWD"    .Values.mariadb.auth.password -}}
  {{- end -}}
{{- end -}}
