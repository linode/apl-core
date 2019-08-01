{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* ######### Hostname templates */}}

{{/*
Returns the hostname.
If the hostname is set in `global.hosts.gitlab.name`, that will be returned,
otherwise the hostname will be assembled using `gitlab` as the prefix, and the `gitlab.assembleHost` function.
*/}}
{{- define "gitlab.gitlab.hostname" -}}
{{- coalesce .Values.global.hosts.gitlab.name (include "gitlab.assembleHost"  (dict "name" "gitlab" "context" . )) -}}
{{- end -}}

{{/*
Returns the GitLab Url, ex: `http://gitlab.example.com`
If `global.hosts.https` or `global.hosts.gitlab.https` is true, it uses https, otherwise http.
Calls into the `gitlab.gitlabHost` function for the hostname part of the url.
*/}}
{{- define "gitlab.gitlab.url" -}}
{{- if or .Values.global.hosts.https .Values.global.hosts.gitlab.https -}}
{{-   printf "https://%s" (include "gitlab.gitlab.hostname" .) -}}
{{- else -}}
{{-   printf "http://%s" (include "gitlab.gitlab.hostname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Returns the minio hostname.
If the hostname is set in `global.hosts.minio.name`, that will be returned,
otherwise the hostname will be assembled using `minio` as the prefix, and the `gitlab.assembleHost` function.
*/}}
{{- define "gitlab.minio.hostname" -}}
{{- coalesce .Values.global.hosts.minio.name (include "gitlab.assembleHost"  (dict "name" "minio" "context" . )) -}}
{{- end -}}

{{/*
Returns the minio url.
*/}}

{{- define "gitlab.minio.url" -}}
{{- if or .Values.global.hosts.https .Values.global.hosts.minio.https -}}
{{-   printf "https://%s" (include "gitlab.minio.hostname" .) -}}
{{- else -}}
{{-   printf "http://%s" (include "gitlab.minio.hostname" .) -}}
{{- end -}}
{{- end -}}

{{/* ######### Utility templates */}}

{{/*
  A helper function for assembling a hostname using the base domain specified in `global.hosts.domain`
  Takes a `Map/Dictonary` as an argument. Where key `name` is the domain to build, and `context` should be a
  reference to the chart's $ object.
  eg: `template "assembleHost" (dict "name" "minio" "context" .)`

  The hostname will be the combined name with the domain. eg: If domain is `example.com`, it will produce `minio.example.com`
  Additionally if `global.hosts.hostSuffix` is set, it will append a hyphen, then the suffix to the name:
  eg: If hostSuffix is `beta` it will produce `minio-beta.example.com`
*/}}
{{- define "gitlab.assembleHost" -}}
{{- $name := .name -}}
{{- $context := .context -}}
{{- $result := dict -}}
{{- if $context.Values.global.hosts.domain -}}
{{-   $_ := set $result "domainHost" (printf ".%s" $context.Values.global.hosts.domain) -}}
{{-   if $context.Values.global.hosts.hostSuffix -}}
{{-     $_ := set $result "domainHost" (printf "-%s%s" $context.Values.global.hosts.hostSuffix $result.domainHost) -}}
{{-   end -}}
{{-   $_ := set $result "domainHost" (printf "%s%s" $name $result.domainHost) -}}
{{- end -}}
{{- $result.domainHost -}}
{{- end -}}

{{/*
  A helper template to collect and insert the registry pull secrets for a component.
*/}}
{{- define "pullsecrets" -}}
{{- if .pullSecrets }}
imagePullSecrets:
{{-   range $index, $entry := .pullSecrets }}
- name: {{$entry.name}}
{{-   end }}
{{- end }}
{{- end -}}

{{/*
Global gitlab imagePullPolicy
*/}}

{{- define "gitlab.imagePullPolicy" -}}
{{- $imageObj := default (dict) .Values.image -}}
{{- if or $imageObj.imagePullPolicy .Values.global.imagePullPolicy -}}
imagePullPolicy: {{ coalesce $imageObj.imagePullPolicy .Values.global.imagePullPolicy | quote }}
{{- end -}}
{{- end -}}

{{/* ######### cert-manager templates */}}

{{- define "gitlab.certmanager_annotations" -}}
{{- if (pluck "configureCertmanager" .Values.global.ingress .Values.ingress (dict "configureCertmanager" false) | first) -}}
certmanager.k8s.io/issuer: "{{ .Release.Name }}-issuer"
{{- end -}}
{{- end -}}

{{/* ######### postgresql templates */}}

{{/*
Return the db hostname
If an external postgresl host is provided, it will use that, otherwise it will fallback
to the service name
This overrides the upstream postegresql chart so that we can deterministically
use the name of the service the upstream chart creates
*/}}
{{- define "gitlab.psql.host" -}}
{{- if .Values.global.psql.host -}}
{{- .Values.global.psql.host | quote -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name "postgresql" -}}
{{- end -}}
{{- end -}}

{{/*
Alias of gitlab.psql.host
*/}}
{{- define "postgresql.fullname" -}}
{{- template "gitlab.psql.host" . -}}
{{- end -}}

{{/*
Return the db database name
*/}}
{{- define "gitlab.psql.database" -}}
{{- coalesce .Values.global.psql.database "gitlabhq_production" -}}
{{- end -}}

{{/*
Return the db username
If the postgresql username is provided, it will use that, otherwise it will fallback
to "gitlab" default
*/}}
{{- define "gitlab.psql.username" -}}
{{- coalesce .Values.global.psql.username "gitlab" -}}
{{- end -}}

{{/*
Return the db port
If the postgresql port is provided, it will use that, otherwise it will fallback
to 5432 default
*/}}
{{- define "gitlab.psql.port" -}}
{{- coalesce .Values.global.psql.port 5432 -}}
{{- end -}}

{{/*
Return the secret name
Defaults to a release-based name and falls back to .Values.global.psql.secretName
  when using an external postegresql
*/}}
{{- define "gitlab.psql.password.secret" -}}
{{- default (printf "%s-%s" .Release.Name "postgresql-password") .Values.global.psql.password.secret | quote -}}
{{- end -}}

{{/*
Alias of gitlab.psql.password.secret to override upstream postgresql chart naming
*/}}
{{- define "postgresql.secretName" -}}
{{- template "gitlab.psql.password.secret" . -}}
{{- end -}}

{{/*
Return the name of the key in a secret that contains the postgres password
Uses `postgres-password` to match upstream postgresql chart when not using an
  external postegresql
*/}}
{{- define "gitlab.psql.password.key" -}}
{{- default "postgres-password" .Values.global.psql.password.key | quote -}}
{{- end -}}

{{/* ######### ingress templates */}}

{{/*
Returns the nginx ingress class
*/}}
{{- define "gitlab.ingressclass" -}}
{{- pluck "class" .Values.global.ingress (dict "class" (printf "%s-nginx" .Release.Name)) | first -}}
{{- end -}}

{{/*
Overrides the nginx-ingress template to make sure gitlab-shell name matches
*/}}
{{- define "nginx-ingress.tcp-configmap" -}}
{{ .Release.Name}}-nginx-ingress-tcp
{{- end -}}

{{/*
Overrides the nginx-ingress template to make sure our ingresses match
*/}}
{{- define "nginx-ingress.controller.ingress-class" -}}
{{ template "gitlab.ingressclass" . }}
{{- end -}}

{{/* ######### annotations */}}

{{/*
Handles merging a set of service annotations
*/}}
{{- define "gitlab.serviceAnnotations" -}}
{{- $allAnnotations := merge (default (dict) (default (dict) .Values.service).annotations) .Values.global.service.annotations -}}
{{- if $allAnnotations -}}
{{- toYaml $allAnnotations -}}
{{- end -}}
{{- end -}}

{{/*
Returns gitlabUrl needed for gitlab-runner
*/}}
{{- define "gitlab-runner.gitlabUrl" -}}
{{- template "gitlab.gitlab.url" . -}}
{{- end -}}

{{/* selfsigned cert for when other options aren't provided */}}
{{- define "gitlab.wildcard-self-signed-cert-name" -}}
{{- default (printf "%s-wildcard-tls" .Release.Name) .Values.global.ingress.tls.secretName -}}
{{- end -}}

{{/*
Detect if `x.ingress.tls.secretName` are set
Return value if either `global.ingress.tls.secretName` or all three `x.ingress.tls.secretName` are set.
Return empty if not

We're explicitly checking for an actual value being present, not the existance of map.
*/}}
{{- define "gitlab.ingress.tls.configured" -}}
{{/* Pull the value, if it exists */}}
{{- $global   := pluck "secretName" $.Values.global.ingress.tls | first -}}
{{- $unicorn  := pluck "secretName" $.Values.gitlab.unicorn.ingress.tls | first -}}
{{- $registry := pluck "secretName" $.Values.registry.ingress.tls | first -}}
{{- $minio    := pluck "secretName" $.Values.minio.ingress.tls | first -}}
{{/* Set each item to configured value, or !enabled
     This works because `false` is the same as empty, so we'll use the value when `enabled: true`
     - default "" (not true) => ''
     - default "" (not false) => 'true'
     - default "valid" (not true) => 'valid'
     - default "valid" (not false) => 'true'
     Now, disabled sub-charts won't block this template from working properly.
*/}}
{{- $unicorn :=  default $unicorn (not $.Values.gitlab.unicorn.enabled) -}}
{{- $registry :=  default $registry (not $.Values.registry.enabled) -}}
{{- $minio :=  default $minio (not $.Values.global.minio.enabled) -}}
{{/* Check that all enabled items have been configured */}}
{{- if or $global (and $unicorn (and $registry $minio)) -}}
true
{{- end -}}
{{- end -}}

{{/*
Detect if `.Values.ingress.tls.enabled` is set
Returns `ingress.tls.enabled` if it is a boolean,
Returns `global.ingress.tls.enabled` if it is a boolean, and `ingress.tls.enabled` is not.
Return true in any other case.
*/}}
{{- define "gitlab.ingress.tls.enabled" -}}
{{- $globalSet := and (hasKey .Values.global.ingress "tls") (and (hasKey .Values.global.ingress.tls "enabled") (kindIs "bool" .Values.global.ingress.tls.enabled)) -}}
{{- $localSet := and (hasKey .Values.ingress "tls") (and (hasKey .Values.ingress.tls "enabled") (kindIs "bool" .Values.ingress.tls.enabled)) -}}
{{- if $localSet }}
{{-   .Values.ingress.tls.enabled }}
{{- else if $globalSet }}
{{-  .Values.global.ingress.tls.enabled }}
{{- else }}
{{-   true }}
{{- end -}}
{{- end -}}

{{/*
Detect if `.Values.ingress.enabled` is set
Returns `ingress.enabled` if it is a boolean,
Returns `global.ingress.enabled` if it is a boolean, and `ingress.enabled` is not.
Return true in any other case.
*/}}
{{- define "gitlab.ingress.enabled" -}}
{{- $globalSet := and (hasKey .Values.global.ingress "enabled") (kindIs "bool" .Values.global.ingress.enabled) -}}
{{- $localSet := and (hasKey .Values.ingress "enabled") (kindIs "bool" .Values.ingress.enabled) -}}
{{- if $localSet }}
{{-   .Values.ingress.enabled }}
{{- else if $globalSet }}
{{-  .Values.global.ingress.enabled }}
{{- else }}
{{-   true }}
{{- end -}}
{{- end -}}
