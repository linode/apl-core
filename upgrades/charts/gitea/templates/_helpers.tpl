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
{{- if .Values.gitea.database.builtIn.postgresql.enabled -}}
{{- printf "%s-postgresql" .Release.Name -}}
{{- else if .Values.gitea.database.builtIn.mysql.enabled -}}
{{- printf "%s-mysql" .Release.Name -}}
{{- else if .Values.gitea.database.builtIn.mariadb.enabled -}}
{{- printf "%s-mariadb" .Release.Name -}}
{{- else if ne .Values.gitea.config.database.DB_TYPE "sqlite3" -}}
{{- $parts := split ":" .Values.gitea.config.database.HOST -}}
{{- printf "%s %s" $parts._0 $parts._1 -}}
{{- end -}}
{{- end -}}

{{- define "db.port" -}}
{{- if .Values.gitea.database.builtIn.postgresql.enabled -}}
{{ .Values.postgresql.global.postgresql.servicePort }}
{{- else if .Values.gitea.database.builtIn.mysql.enabled -}}
{{ .Values.mysql.service.port }}
{{- else if .Values.gitea.database.builtIn.mariadb.enabled -}}
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
{{- if not (hasKey .Values.gitea.ldap "bindDn") -}}
{{- $_ := set .Values.gitea.ldap "bindDn" "" -}}
{{- end -}}

{{- if not (hasKey .Values.gitea.ldap "bindPassword") -}}
{{- $_ := set .Values.gitea.ldap "bindPassword" "" -}}
{{- end -}}

{{- $flags := list "notActive" "skipTlsVerify" "allowDeactivateAll" "synchronizeUsers" "attributesInBind" -}}
{{- range $key, $val := .Values.gitea.ldap -}}
{{- if and (ne $key "enabled") (ne $key "existingSecret") -}}
{{- if eq $key "bindDn" -}}
{{- printf "--%s %s " ($key | kebabcase) ("${GITEA_LDAP_BIND_DN}" | quote ) -}}
{{- else if eq $key "bindPassword" -}}
{{- printf "--%s %s " ($key | kebabcase) ("${GITEA_LDAP_PASSWORD}" | quote ) -}}
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
{{- range $key, $val := .Values.gitea.oauth -}}
{{- if ne $key "enabled" -}}
{{- printf "--%s %s " ($key | kebabcase) ($val | squote) -}}
{{- end -}}
{{- end -}}
{{- end -}}
