{{/*
Secondary entrypoint and primary loader for the common chart
*/}}
{{- define "bjw-s.common.loader.generate" -}}
  {{- /* Enable code-server add-on if required */ -}}
  {{- if .Values.addons.codeserver.enabled -}}
    {{- include "bjw-s.common.addon.codeserver" . | nindent 0 -}}
  {{- end -}}

  {{- /* Enable VPN add-on if required */ -}}
  {{- if .Values.addons.vpn.enabled -}}
    {{- include "bjw-s.common.addon.vpn" . | nindent 0 -}}
  {{- end -}}

  {{- /* Enable netshoot add-on if required */ -}}
  {{- if .Values.addons.netshoot.enabled -}}
    {{- include "bjw-s.common.addon.netshoot" . | nindent 0 -}}
  {{- end -}}

  {{- /* Build the templates */ -}}
  {{- include "bjw-s.common.render.pvcs" . | nindent 0 -}}
  {{- include "bjw-s.common.render.serviceAccount" . | nindent 0 -}}
  {{- include "bjw-s.common.render.controller" . | nindent 0 -}}
  {{- include "bjw-s.common.render.services" . | nindent 0 -}}
  {{- include "bjw-s.common.render.ingresses" . | nindent 0 -}}
  {{- include "bjw-s.common.render.serviceMonitors" . | nindent 0 -}}
  {{- include "bjw-s.common.render.routes" . | nindent 0 -}}
  {{- include "bjw-s.common.render.configmaps" . | nindent 0 -}}
  {{- include "bjw-s.common.render.secrets" . | nindent 0 -}}
{{- end -}}
