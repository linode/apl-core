{{/* ######### Minio related templates */}}

{{/*
Return the minio credentials secret
*/}}
{{- define "gitlab.minio.credentials.secret" -}}
{{- default (printf "%s-minio-secret" .Release.Name) .Values.global.minio.credentials.secret | quote -}}
{{- end -}}
