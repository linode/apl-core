{{/*
The deployKey secret to be included.
*/}}
{{- define "bjw-s.common.addon.codeserver.deployKeySecret" -}}
  {{- $deployKeyValue := .Values.addons.codeserver.git.deployKey -}}
  {{- if .Values.addons.codeserver.git.deployKeyBase64 -}}
    {{- $deployKeyValue = .Values.addons.codeserver.git.deployKeyBase64 | b64dec -}}
  {{- end -}}
id_rsa: {{ $deployKeyValue | quote }}
{{- end -}}
