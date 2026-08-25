{{/*
Main entrypoint for the common library chart. It will render all underlying templates based on the provided values.
*/}}
{{- define "bjw-s.common.loader.all" -}}
  {{- /* Generate chart and dependency values */ -}}
  {{- include "bjw-s.common.loader.init" . -}}

  {{- /* Generate remaining objects */ -}}
  {{- include "bjw-s.common.loader.generate" . -}}
{{- end -}}
