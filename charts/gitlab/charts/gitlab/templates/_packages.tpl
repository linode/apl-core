{{/*
Generates a templated config for packages key in gitlab.yml.

Usage:
{{ include "gitlab.appConfig.packages.configuration" ( \
     dict                                              \
         "config" .Values.path.to.packages.config      \
         "context" $                                   \
     ) }}
*/}}
{{- define "gitlab.appConfig.packages.configuration" -}}
packages:
  enabled: {{ if kindIs "bool" .config.enabled }}{{ eq .config.enabled true }}{{ end }}
  {{- include "gitlab.appConfig.objectStorage.configuration" (dict "name" "packages" "config" .config "context" .context) | nindent 2 }}
{{- end -}}{{/* "gitlab.appConfig.packages.configuration" */}}
