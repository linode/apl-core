{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "keycloak.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate to 20 characters because this is used to set the node identifier in WildFly which is limited to
23 characters. This allows for a replica suffix for up to 99 replicas.
*/}}
{{- define "keycloak.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 20 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 20 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 20 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create the service DNS name.
*/}}
{{- define "keycloak.serviceDnsName" -}}
{{ include "keycloak.fullname" . }}-headless.{{ .Release.Namespace }}.svc.{{ .Values.clusterDomain }}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "keycloak.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
{{/*
Create common labels.
*/}}
{{- define "keycloak.commonLabels" -}}
helm.sh/chart: {{ include "keycloak.chart" . }}
{{ include "keycloak.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}

{{- end -}}

{{/*
Create selector labels.
*/}}
{{- define "keycloak.selectorLabels" -}}
app.kubernetes.io/name: {{ include "keycloak.name" . }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
{{- end -}}

{{/*
Create name of the service account to use
*/}}
{{- define "keycloak.serviceAccountName" -}}
{{- if .Values.keycloak.serviceAccount.create -}}
    {{ default (include "keycloak.fullname" .) .Values.keycloak.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.keycloak.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Create a default fully qualified app name for the postgres requirement.
*/}}
{{- define "keycloak.postgresql.fullname" -}}
{{- $postgresContext := dict "Values" .Values.postgresql "Release" .Release "Chart" (dict "Name" "postgresql") -}}
{{ include "postgresql.fullname" $postgresContext }}
{{- end -}}

{{/*
Create the name for the Keycloak secret.
*/}}
{{- define "keycloak.secret" -}}
{{- if .Values.keycloak.existingSecret -}}
  {{- tpl .Values.keycloak.existingSecret $ -}}
{{- else -}}
  {{- include "keycloak.fullname" . -}}-http
{{- end -}}
{{- end -}}

{{/*
Create the name for the database secret.
*/}}
{{- define "keycloak.dbSecretName" -}}
{{- if .Values.keycloak.persistence.existingSecret -}}
  {{- tpl .Values.keycloak.persistence.existingSecret $ -}}
{{- else -}}
  {{- include "keycloak.fullname" . -}}-db
{{- end -}}
{{- end -}}

{{/*
Create the Keycloak password.
*/}}
{{- define "keycloak.password" -}}
{{- if .Values.keycloak.password -}}
  {{- .Values.keycloak.password | b64enc | quote -}}
{{- else -}}
  {{- randAlphaNum 16 | b64enc | quote -}}
{{- end -}}
{{- end -}}

{{/*
Create the name for the password secret key.
*/}}
{{- define "keycloak.passwordKey" -}}
{{- if .Values.keycloak.existingSecret -}}
  {{- .Values.keycloak.existingSecretKey -}}
{{- else -}}
  password
{{- end -}}
{{- end -}}

{{/*
Create the name for the database password secret key.
*/}}
{{- define "keycloak.dbPasswordKey" -}}
{{- if and .Values.keycloak.persistence.existingSecret .Values.keycloak.persistence.existingSecretPasswordKey -}}
  {{- .Values.keycloak.persistence.existingSecretPasswordKey -}}
{{- else -}}
  password
{{- end -}}
{{- end -}}

{{/*
Create the name for the database password secret key - if it is defined.
*/}}
{{- define "keycloak.dbUserKey" -}}
{{- if and .Values.keycloak.persistence.existingSecret .Values.keycloak.persistence.existingSecretUsernameKey -}}
  {{- .Values.keycloak.persistence.existingSecretUsernameKey -}}
{{- else -}}
  username
{{- end -}}
{{- end -}}

{{/*
Create environment variables for database configuration.
*/}}
{{- define "keycloak.dbEnvVars" -}}
{{- if .Values.keycloak.persistence.deployPostgres }}
{{- if not (eq "postgres" .Values.keycloak.persistence.dbVendor) }}
{{ fail (printf "ERROR: 'Setting keycloak.persistence.deployPostgres' to 'true' requires setting 'keycloak.persistence.dbVendor' to 'postgres' (is: '%s')!" .Values.keycloak.persistence.dbVendor) }}
{{- end }}
- name: DB_VENDOR
  value: postgres
- name: DB_ADDR
  value: {{ include "keycloak.postgresql.fullname" . }}
- name: DB_PORT
  value: "5432"
- name: DB_DATABASE
  value: {{ .Values.postgresql.postgresqlDatabase | quote }}
- name: DB_USER
  value: {{ .Values.postgresql.postgresqlUsername | quote }}
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "keycloak.postgresql.fullname" . }}
      key: postgresql-password
{{- else }}
- name: DB_VENDOR
  value: {{ .Values.keycloak.persistence.dbVendor | quote }}
{{- if not (eq "h2" .Values.keycloak.persistence.dbVendor) }}
- name: DB_ADDR
  value: {{ .Values.keycloak.persistence.dbHost | quote }}
- name: DB_PORT
  value: {{ .Values.keycloak.persistence.dbPort | quote }}
- name: DB_DATABASE
  value: {{ .Values.keycloak.persistence.dbName | quote }}
- name: DB_USER
  valueFrom:
    secretKeyRef:
      name: {{ include "keycloak.dbSecretName" . }}
      key: {{ include "keycloak.dbUserKey" . | quote }}
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "keycloak.dbSecretName" . }}
      key: {{ include "keycloak.dbPasswordKey" . | quote }}
{{- end }}
{{- end }}
{{- end -}}

{{/*
Create the namespace for the serviceMonitor deployment.
*/}}
{{- define "keycloak.serviceMonitor.namespace" -}}
{{- if .Values.prometheus.operator.serviceMonitor.namespace -}}
{{ .Values.prometheus.operator.serviceMonitor.namespace }}
{{- else -}}
{{ .Release.Namespace }}
{{- end -}}
{{- end -}}
