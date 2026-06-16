{{/*
HPA helper
*/}}

{{- define "loki.hpa" }}
{{- if .component.autoscaling.enabled }}
  {{- $target := .target }}
  {{- $kind := .component.kind | default .kind | default "StatefulSet" }}
  {{- $ctx := .ctx }}
  {{- $component := .component }}
  {{- $targetName := .targetName }}
  {{- $suffix := .suffix | default "" }}
  {{- with $ctx }}
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "loki.resourceName" (dict "ctx" . "component" $target "suffix" $suffix) }}
  namespace: {{ include "loki.namespace" . }}
  labels:
    {{- include "loki.labels" . | nindent 4 }}
    app.kubernetes.io/component: {{ $target }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: {{ $kind }}
    name: "{{ $targetName | default (include "loki.workloadResourceName" (dict "ctx" $ctx "component" $target "componentValues" $component "suffix" $suffix)) }}"
  minReplicas: {{ $component.autoscaling.minReplicas }}
  maxReplicas: {{ $component.autoscaling.maxReplicas }}
  {{- $behavior := $component.autoscaling.behavior | default dict }}
  {{- $enabled := get $behavior "enabled" | default false }}
  {{- if $enabled }}
  behavior:
    {{- toYaml (omit $behavior "enabled") | nindent 4 }}
  {{- end }}
  {{- if or $component.autoscaling.targetMemoryUtilizationPercentage $component.autoscaling.targetCPUUtilizationPercentage $component.autoscaling.customMetrics }}
  metrics:
  {{- with $component.autoscaling.targetMemoryUtilizationPercentage }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ . }}
  {{- end }}
  {{- with $component.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ . }}
  {{- end }}
  {{- with $component.autoscaling.customMetrics }}
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- else }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 80
  {{- end }}
  {{- end }}
{{- end }}
{{- end }}
