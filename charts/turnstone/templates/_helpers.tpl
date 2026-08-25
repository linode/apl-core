{{/*
Expand the name of the chart.
*/}}
{{- define "turnstone.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this
(by the DNS naming spec). If release name contains chart name it will be used
as a full name.
*/}}
{{- define "turnstone.fullname" -}}
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
{{- define "turnstone.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "turnstone.labels" -}}
helm.sh/chart: {{ include "turnstone.chart" . }}
{{ include "turnstone.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels.
*/}}
{{- define "turnstone.selectorLabels" -}}
app.kubernetes.io/name: {{ include "turnstone.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use.
*/}}
{{- define "turnstone.serviceAccountName" -}}
{{- if .Values.serviceAccount }}
{{- if .Values.serviceAccount.name }}
{{- .Values.serviceAccount.name }}
{{- else }}
{{- include "turnstone.fullname" . }}
{{- end }}
{{- else }}
{{- include "turnstone.fullname" . }}
{{- end }}
{{- end }}

{{/*
Determine the PostgreSQL host.
*/}}
{{- define "turnstone.postgresql.host" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" .Release.Name }}
{{- else }}
{{- .Values.database.external.host }}
{{- end }}
{{- end }}

{{/*
Determine the PostgreSQL port.
*/}}
{{- define "turnstone.postgresql.port" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "5432" }}
{{- else }}
{{- .Values.database.external.port | toString }}
{{- end }}
{{- end }}

{{/*
Determine the PostgreSQL database name.
*/}}
{{- define "turnstone.postgresql.database" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.database }}
{{- else }}
{{- .Values.database.external.database }}
{{- end }}
{{- end }}

{{/*
Determine the PostgreSQL username.
*/}}
{{- define "turnstone.postgresql.username" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.username }}
{{- else }}
{{- .Values.database.external.username }}
{{- end }}
{{- end }}

{{/*
The PostgreSQL password when the chart stores it itself, empty when it
does not. Doubles as the predicate for "does <fullname>-secrets need to
carry POSTGRES_PASSWORD", so an inline password is never written
anywhere but <fullname>-secrets, and an operator-supplied Secret is
never duplicated into it.

An operator-supplied existingSecret wins outright: writing the value
into a second Secret nothing reads would only duplicate a credential.

Both branches need "default" because this is reached through include,
which captures rendered text rather than a value: a key that is unset
rather than empty — "password:" with nothing after it — renders as the
literal "<no value>", and a ten-character string is truthy. Without the
default that lands base64-encoded in POSTGRES_PASSWORD and the workloads
authenticate with it.
*/}}
{{- define "turnstone.db.inlinePassword" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.password | default "" }}
{{- else if not .Values.database.external.existingSecret }}
{{- .Values.database.external.password | default "" }}
{{- end }}
{{- end }}

{{/*
The name of the bundled subchart's own Secret.

Mirrors the subchart's naming rather than calling its helpers, which
expect a context scoped to the subchart that this chart cannot hand
them. Release-derived, so deliberately not turnstone.fullname: a
fullnameOverride here renames this chart's resources and leaves the
subchart's alone, and pointing at "<fullname>-postgresql" would then
name a Secret that does not exist.

The subchart also normalises the release name through a regex before
using it, which is a no-op for the DNS-1123 names Helm accepts, so it is
not reproduced.
*/}}
{{- define "turnstone.postgresql.fullname" -}}
{{- $global := ((.Values.global).postgresql).fullnameOverride }}
{{- if $global }}
{{- $global | trunc 63 | trimSuffix "-" }}
{{- else if .Values.postgresql.fullnameOverride }}
{{- .Values.postgresql.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := .Values.postgresql.nameOverride | default "postgresql" }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "turnstone.postgresql.secretName" -}}
{{- $existing := coalesce (((.Values.global).postgresql).auth).existingSecret .Values.postgresql.auth.existingSecret }}
{{- if $existing }}
{{- tpl $existing . }}
{{- else }}
{{- include "turnstone.postgresql.fullname" . }}
{{- end }}
{{- end }}

{{/*
The subchart stores the named user's password under "password" and the
superuser's under "postgres-password", and lets an operator rename
either through auth.secretKeys.
*/}}
{{- define "turnstone.postgresql.passwordKey" -}}
{{- $user := .Values.postgresql.auth.username | default "" }}
{{- $keys := .Values.postgresql.auth.secretKeys | default dict }}
{{- if or (empty $user) (eq $user "postgres") }}
{{- $keys.adminPasswordKey | default "postgres-password" }}
{{- else }}
{{- $keys.userPasswordKey | default "password" }}
{{- end }}
{{- end }}

{{/*
Determine the secret holding the PostgreSQL password, and the key within
it. Three sources, and the two helpers agree by construction because
they branch identically:

  - an external database pointed at a Secret the chart does not own (a
    CloudNativePG-generated secret, an External Secrets target, ...), in
    which case the key is rarely "POSTGRES_PASSWORD" — hence the
    companion existingSecretPasswordKey
  - the bundled subchart's own Secret, when it generates the password
  - <fullname>-secrets, when the password is supplied inline in values

Note the last is deliberately not turnstone.llm.secretName: that
resolves to llm.existingSecret when the operator supplies one, which
holds LLM API keys and has no reason to carry a database password.
*/}}
{{- define "turnstone.db.secretName" -}}
{{- if not .Values.postgresql.enabled }}
{{- if .Values.database.external.existingSecret }}
{{- .Values.database.external.existingSecret }}
{{- else }}
{{- printf "%s-secrets" (include "turnstone.fullname" .) }}
{{- end }}
{{- else if include "turnstone.db.inlinePassword" . }}
{{- printf "%s-secrets" (include "turnstone.fullname" .) }}
{{- else }}
{{- include "turnstone.postgresql.secretName" . }}
{{- end }}
{{- end }}

{{- define "turnstone.db.passwordKey" -}}
{{- if not .Values.postgresql.enabled }}
{{- if .Values.database.external.existingSecret }}
{{- .Values.database.external.existingSecretPasswordKey | default "password" }}
{{- else }}
{{- printf "POSTGRES_PASSWORD" }}
{{- end }}
{{- else if include "turnstone.db.inlinePassword" . }}
{{- printf "POSTGRES_PASSWORD" }}
{{- else }}
{{- include "turnstone.postgresql.passwordKey" . }}
{{- end }}
{{- end }}

{{/*
Database environment shared by the server, console and migrate Job.

Every value except the password is rendered inline rather than pulled
from the ConfigMap via envFrom, so that one definition serves all three
workloads and the URL is assembled in exactly one place.

POSTGRES_PASSWORD must still precede TURNSTONE_DB_URL: the kubelet
expands $(VAR) only against env entries declared earlier in the list, so
a later definition would leave a literal "$(POSTGRES_PASSWORD)" in the
URL.
*/}}
{{- define "turnstone.db.env" -}}
- name: TURNSTONE_DB_BACKEND
  value: {{ .Values.database.backend | quote }}
- name: POSTGRES_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "turnstone.db.secretName" . }}
      key: {{ include "turnstone.db.passwordKey" . }}
- name: TURNSTONE_DB_URL
  value: "postgresql+psycopg://{{ include "turnstone.postgresql.username" . }}:$(POSTGRES_PASSWORD)@{{ include "turnstone.postgresql.host" . }}:{{ include "turnstone.postgresql.port" . }}/{{ include "turnstone.postgresql.database" . }}{{ if and (not .Values.postgresql.enabled) .Values.database.external.sslmode }}?sslmode={{ .Values.database.external.sslmode }}{{ end }}"
{{- end }}

{{/*
Determine the secret name for LLM API keys.
*/}}
{{- define "turnstone.llm.secretName" -}}
{{- if .Values.llm.existingSecret }}
{{- .Values.llm.existingSecret }}
{{- else }}
{{- printf "%s-secrets" (include "turnstone.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Determine the secret name for auth tokens.
*/}}
{{- define "turnstone.auth.secretName" -}}
{{- if .Values.auth.existingSecret }}
{{- .Values.auth.existingSecret }}
{{- else }}
{{- printf "%s-secrets" (include "turnstone.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Container image reference.
*/}}
{{- define "turnstone.image" -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion }}
{{- printf "%s:%s" .Values.image.repository $tag }}
{{- end }}
