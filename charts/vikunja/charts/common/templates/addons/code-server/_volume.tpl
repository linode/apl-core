{{/*
The volume (referencing git deploykey) to be inserted into additionalVolumes.
*/}}
{{- define "bjw-s.common.addon.codeserver.deployKeyVolumeSpec" -}}
secret:
  {{- if .Values.addons.codeserver.git.deployKeySecret }}
  secretName: {{ .Values.addons.codeserver.git.deployKeySecret }}
  {{- else }}
  secretName: {{ include "bjw-s.common.lib.chart.names.fullname" . }}-addon-codeserver-deploykey
  {{- end }}
  defaultMode: {{ "0400" | toDecimal }}
  items:
    - key: id_rsa
      path: id_rsa
{{- end -}}
