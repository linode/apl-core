{{/* ######### unicorn templates */}}

{{/*
Return the unicorn hostname
If the unicorn host is provided, it will use that, otherwise it will fallback
to the service name
*/}}
{{- define "gitlab.unicorn.host" -}}
{{- if .Values.unicorn.host -}}
{{- .Values.unicorn.host -}}
{{- else -}}
{{- $name := default "unicorn" .Values.unicorn.serviceName -}}
{{- printf "%s-%s" .Release.Name $name -}}
{{- end -}}
{{- end -}}
