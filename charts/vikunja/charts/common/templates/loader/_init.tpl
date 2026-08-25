{{- define "bjw-s.common.loader.init" -}}
  {{- /* Merge the local chart values and the common chart defaults */ -}}
  {{- include "bjw-s.common.values.init" . }}
{{- end -}}
