{{/*
Tempo common PodDisruptionBudget definition
Params:
  ctx = . context
  component = name of the component
*/}}
{{- define "tempo.lib.podDisruptionBudget" -}}
{{- $componentSection := include "tempo.componentSectionFromName" . }}
{{ with (index $.ctx.Values $componentSection) }}
{{- if .podDisruptionBudget -}}
apiVersion: {{ include "tempo.podDisruptionBudget.apiVersion" $.ctx }}
kind: PodDisruptionBudget
metadata:
  name: {{ include "tempo.resourceName" (dict "ctx" $.ctx "component" $.component) }}
  labels:
    {{- include "tempo.labels" (dict "ctx" $.ctx "component" $.component) | nindent 4 }}
  namespace: {{ $.ctx.Release.Namespace | quote }}
spec:
  selector:
    matchLabels:
      {{- include "tempo.selectorLabels" (dict "ctx" $.ctx "component" $.component) | nindent 6 }}
{{ toYaml .podDisruptionBudget | indent 2 }}
{{- end -}}
{{- end -}}
{{- end -}}
