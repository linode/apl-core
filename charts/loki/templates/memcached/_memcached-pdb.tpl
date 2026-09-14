{{/*
memcached PDB
Params:
  ctx = . context
  memcacheConfig = cache config
  valuesSection = name of the section in values.yaml
  component = name of the component
valuesSection and component are specified separately because helm prefers camelcase for naming convention and k8s components are named with snake case.
*/}}
{{- define "loki.memcached.pdb" -}}
{{- with $.memcacheConfig }}
{{- include "loki.pdb" (dict
  "ctx" $.ctx
  "target" $.component
  "suffix" .suffix
  "component" .
  "componentLabel" (printf "memcached-%s%s" $.component (include "loki.memcached.suffix" .suffix))
) }}
{{- end -}}
{{- end -}}
