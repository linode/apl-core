{{/*
This template serves as a blueprint for Cronjob objects that are created
using the common library.
*/}}
{{- define "bjw-s.common.class.cronjob" -}}
  {{- $restartPolicy := default "Never" .Values.controller.restartPolicy -}}
  {{- if and (ne $restartPolicy "Never") (ne $restartPolicy "OnFailure") -}}
    {{- fail (printf "Not a valid restartPolicy for CronJob (%s)" $restartPolicy) -}}
  {{- end -}}
  {{- $_ := set .Values.controller "restartPolicy" $restartPolicy -}}
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: {{ include "bjw-s.common.lib.chart.names.fullname" . }}
  {{- with include "bjw-s.common.lib.controller.metadata.labels" . }}
  labels: {{- . | nindent 4 }}
  {{- end }}
  {{- with include "bjw-s.common.lib.controller.metadata.annotations" . }}
  annotations: {{- . | nindent 4 }}
  {{- end }}
spec:
  concurrencyPolicy: "{{ .Values.controller.cronjob.concurrencyPolicy }}"
  startingDeadlineSeconds: {{ .Values.controller.cronjob.startingDeadlineSeconds }}
  schedule: "{{ .Values.controller.cronjob.schedule }}"
  successfulJobsHistoryLimit: {{ .Values.controller.cronjob.successfulJobsHistory }}
  failedJobsHistoryLimit: {{ .Values.controller.cronjob.failedJobsHistory }}
  jobTemplate:
    spec:
      {{- with .Values.controller.cronjob.ttlSecondsAfterFinished }}
      ttlSecondsAfterFinished: {{ . }}
      {{- end }}
      backoffLimit: {{ .Values.controller.cronjob.backoffLimit }}
      template:
        metadata:
          {{- with include ("bjw-s.common.lib.metadata.podAnnotations") . }}
          annotations:
            {{- . | nindent 12 }}
          {{- end }}
          labels:
            {{- include "bjw-s.common.lib.metadata.selectorLabels" . | nindent 12 }}
            {{- with .Values.podLabels }}
            {{- toYaml . | nindent 12 }}
            {{- end }}
        spec:
          {{- include "bjw-s.common.lib.controller.pod" . | nindent 10 }}
{{- end -}}
