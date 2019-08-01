{{- define "gitlab.appConfig.defaultProjectsFeatures.configuration" -}}
{{- with .Values.global.appConfig -}}
default_projects_features:
  issues: {{ eq .defaultProjectsFeatures.issues true }}
  merge_requests: {{ eq .defaultProjectsFeatures.mergeRequests true }}
  wiki: {{ eq .defaultProjectsFeatures.wiki true }}
  snippets: {{ eq .defaultProjectsFeatures.snippets true }}
  builds: {{ eq .defaultProjectsFeatures.builds true }}
  container_registry: {{ or (not (kindIs "bool" .defaultProjectsFeatures.containerRegistry)) .defaultProjectsFeatures.containerRegistry }}
{{- end -}}
{{- end -}}{{/* "gitlab.appConfig.defaultProjectsFeatures.configuration" */}}
