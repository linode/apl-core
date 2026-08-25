{{/*
Renders the controller object required by the chart.
*/}}
{{- define "bjw-s.common.render.controller" -}}
  {{- if .Values.controller.enabled -}}
    {{- if eq .Values.controller.type "deployment" -}}
      {{- include "bjw-s.common.class.deployment" . | nindent 0 -}}
    {{- else if eq .Values.controller.type "cronjob" -}}
      {{- include "bjw-s.common.class.cronjob" . | nindent 0 -}}
    {{ else if eq .Values.controller.type "daemonset" -}}
      {{- include "bjw-s.common.class.daemonset" . | nindent 0 -}}
    {{ else if eq .Values.controller.type "statefulset"  -}}
      {{- include "bjw-s.common.class.statefulset" . | nindent 0 -}}
    {{ else -}}
      {{- fail (printf "Not a valid controller.type (%s)" .Values.controller.type) -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
