{{/* ######### Registry related templates */}}

{{/*
Return the registry certificate secret name
*/}}
{{- define "gitlab.registry.certificate.secret" -}}
{{- default (printf "%s-registry-secret" .Release.Name) .Values.global.registry.certificate.secret | quote -}}
{{- end -}}

{{/*
Return the registry's httpSecert secret name
*/}}
{{- define "gitlab.registry.httpSecret.secret" -}}
{{- default (printf "%s-registry-httpsecret" .Release.Name) .Values.global.registry.httpSecret.secret | quote -}}
{{- end -}}

{{/*
Return the registry's httpSecert secret key
*/}}
{{- define "gitlab.registry.httpSecret.key" -}}
{{- default "secret" .Values.global.registry.httpSecret.key | quote -}}
{{- end -}}
