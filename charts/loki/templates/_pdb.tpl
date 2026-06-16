{{/*
PDB helper
*/}}

{{- define "loki.pdb" }}
{{- if and (.component.podDisruptionBudget.enabled) (or
  (and (not (dig "autoscaling" "enabled" false .component)) (not (dig "kedaAutoscaling" "enabled" false .component)) (gt (int .component.replicas | default 1) 1))
  (and (dig "autoscaling" "enabled" false .component) (gt (int ((dig "autoscaling" "minReplicas" 1 .component))) 1))
  (and (dig "kedaAutoscaling" "enabled" false .component) (gt (int ((dig "kedaAutoscaling" "minReplicas" 1 .component))) 1)))
-}}
  {{- $target := .target }}
  {{- $ctx := .ctx }}
  {{- $component := .component }}
  {{- $suffix := .suffix }}
  {{- $extraMatchLabels := .extraMatchLabels }}
  {{- $extraMatchExpressions := .extraMatchExpressions }}
  {{- with $ctx }}
    {{- $podDisruptionBudget := dict }}
    {{- if hasKey $component "maxUnavailable"}}
    {{- if not (kindIs "invalid" $component.maxUnavailable) }}
    {{- $_ := set $podDisruptionBudget "maxUnavailable" $component.maxUnavailable }}
    {{- end }}
    {{- end }}
    {{- $_ := mergeOverwrite $podDisruptionBudget (omit ($component.podDisruptionBudget | default dict) "enabled" "labels" "annotations") }}
    {{- if (omit $podDisruptionBudget "selector") }}
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "loki.resourceName" (dict "ctx" $ctx "component" $target "suffix" $suffix) }}
  namespace: {{ include "loki.namespace" $ctx }}
  {{- with $component.podDisruptionBudget.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  labels:
    {{- include "loki.labels" $ctx | nindent 4 }}
    app.kubernetes.io/component: {{ $target }}
    {{- with $component.podDisruptionBudget.labels }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
spec:
  {{- toYaml (omit $podDisruptionBudget "selector") | nindent 2 }}
  selector:
    matchLabels:
      {{- include "loki.selectorLabels" $ctx | nindent 6 }}
      app.kubernetes.io/component: {{ $target }}
    {{- with $extraMatchLabels }}
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- with $extraMatchExpressions }}
    matchExpressions:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    {{- end }}
  {{- end }}
{{- end }}
{{- end }}
