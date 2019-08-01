{{/*
Generates a templated config for artifacts key in gitlab.yml.

Usage:
{{ include "gitlab.appConfig.artifacts.configuration" ( \
     dict                                               \
         "config" .Values.path.to.artifacts.config      \
         "context" $                                    \
     ) }}
*/}}
{{- define "gitlab.appConfig.artifacts.configuration" -}}
artifacts:
  enabled: {{ if kindIs "bool" .config.enabled }}{{ eq .config.enabled true }}{{ end }}
  {{- include "gitlab.appConfig.objectStorage.configuration" (dict "name" "artifacts" "config" .config "context" .context) | nindent 2 }}
{{- end -}}{{/* "gitlab.appConfig.artifacts.configuration" */}}
