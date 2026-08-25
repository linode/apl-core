{{/*
This template serves as the blueprint for the StatefulSet objects that are created
within the common library.
*/}}
{{- define "bjw-s.common.class.statefulset" -}}
  {{- $strategy := default "RollingUpdate" .Values.controller.strategy -}}
  {{- if and (ne $strategy "OnDelete") (ne $strategy "RollingUpdate") -}}
    {{- fail (printf "Not a valid strategy type for StatefulSet (%s)" $strategy) -}}
  {{- end -}}
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: {{ include "bjw-s.common.lib.chart.names.fullname" . }}
  {{- with include "bjw-s.common.lib.controller.metadata.labels" . }}
  labels: {{- . | nindent 4 }}
  {{- end }}
  {{- with include "bjw-s.common.lib.controller.metadata.annotations" . }}
  annotations: {{- . | nindent 4 }}
  {{- end }}
spec:
  revisionHistoryLimit: {{ .Values.controller.revisionHistoryLimit }}
  replicas: {{ .Values.controller.replicas }}
  podManagementPolicy: {{ default "OrderedReady" .Values.controller.podManagementPolicy }}
  updateStrategy:
    type: {{ $strategy }}
    {{- if and (eq $strategy "RollingUpdate") .Values.controller.rollingUpdate.partition }}
    rollingUpdate:
      partition: {{ .Values.controller.rollingUpdate.partition }}
    {{- end }}
  selector:
    matchLabels:
      {{- include "bjw-s.common.lib.metadata.selectorLabels" . | nindent 6 }}
  serviceName: {{ include "bjw-s.common.lib.chart.names.fullname" . }}
  template:
    metadata:
      {{- with include ("bjw-s.common.lib.metadata.podAnnotations") . }}
      annotations:
        {{- . | nindent 8 }}
      {{- end }}
      labels:
        {{- include "bjw-s.common.lib.metadata.selectorLabels" . | nindent 8 }}
        {{- with .Values.podLabels }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
    spec:
      {{- include "bjw-s.common.lib.controller.pod" . | nindent 6 }}
  volumeClaimTemplates:
    {{- range $index, $volumeClaimTemplate := .Values.volumeClaimTemplates }}
    - metadata:
        name: {{ $volumeClaimTemplate.name }}
        {{- with ($volumeClaimTemplate.labels | default dict) }}
        labels: {{- toYaml . | nindent 10 }}
        {{- end }}
        {{- with ($volumeClaimTemplate.annotations | default dict) }}
        annotations: {{- toYaml . | nindent 10 }}
        {{- end }}
      spec:
        accessModes:
          - {{ required (printf "accessMode is required for volumeClaimTemplate %v" $volumeClaimTemplate.name) $volumeClaimTemplate.accessMode  | quote }}
        resources:
          requests:
            storage: {{ required (printf "size is required for PVC %v" $volumeClaimTemplate.name) $volumeClaimTemplate.size | quote }}
        {{- if $volumeClaimTemplate.storageClass }}
        storageClassName: {{ if (eq "-" $volumeClaimTemplate.storageClass) }}""{{- else }}{{ $volumeClaimTemplate.storageClass | quote }}{{- end }}
        {{- end }}
    {{- end }}
{{- end }}
