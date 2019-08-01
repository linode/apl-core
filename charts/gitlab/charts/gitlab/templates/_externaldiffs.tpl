{{/*
Generates a templated config for external_diffs key in gitlab.yml.

Usage:
{{ include "gitlab.appConfig.external_diffs.configuration" ( \
     dict                                                    \
         "config" .Values.path.to.external_diffs.config      \
         "context" $                                         \
     ) }}
*/}}
{{- define "gitlab.appConfig.external_diffs.configuration" -}}
external_diffs:
  enabled: {{ if kindIs "bool" .config.enabled }}{{ eq .config.enabled true }}{{ end }}
  when: {{ .config.when }}
  {{- include "gitlab.appConfig.objectStorage.configuration" (dict "name" "external_diffs" "config" .config "context" .context) | nindent 2 }}
{{- end -}}{{/* "gitlab.appConfig.external_diffs.configuration" */}}
