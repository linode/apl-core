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
{{ with $.memcacheConfig }}
{{- $pdb := mergeOverwrite (pick . "maxUnavailable") .podDisruptionBudget }}
{{- $pdbSpec := dict }}
{{- range $key, $value := omit $pdb "enabled" "labels" "annotations" }}
{{- if not (kindIs "invalid" $value) }}
{{- $_ := set $pdbSpec $key $value }}
{{- end }}
{{- end }}
{{- if and .enabled .podDisruptionBudget.enabled (gt (int .replicas) 1) -}}
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "loki.resourceName" (dict "ctx" $.ctx "component" $.component "suffix" .suffix) }}
  namespace: {{ include "loki.namespace" $.ctx }}
  {{- with $pdb.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  labels:
    {{- include "loki.selectorLabels" $.ctx | nindent 4 }}
    app.kubernetes.io/component: "memcached-{{ $.component }}{{ include "loki.memcached.suffix" .suffix }}"
    {{- with $pdb.labels }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
spec:
  {{- with $pdbSpec }}
  {{- toYaml . | nindent 2 }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "loki.selectorLabels" $.ctx | nindent 6 }}
      app.kubernetes.io/component: "memcached-{{ $.component }}{{ include "loki.memcached.suffix" .suffix }}"
    {{- end }}
{{- end -}}
{{- end -}}
