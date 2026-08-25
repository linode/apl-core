{{/*
Image used by the main container.
*/}}
{{- define "bjw-s.common.lib.container.image" -}}
  {{- $imageRepo := .Values.image.repository -}}
  {{- $imageTag := default .Chart.AppVersion .Values.image.tag -}}

  {{- if kindIs "float64" .Values.image.tag -}}
    {{- $imageTag = .Values.image.tag | toString -}}
  {{- end -}}

  {{- if and $imageRepo $imageTag -}}
    {{- printf "%s:%s" $imageRepo $imageTag -}}
  {{- end -}}
{{- end -}}
