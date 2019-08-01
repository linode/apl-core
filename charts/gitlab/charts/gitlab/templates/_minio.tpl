{{/* ######### Minio related templates */}}

{{/*
Return the minio service endpoint
*/}}
{{- define "gitlab.minio.endpoint" -}}
{{- $name := default "minio-svc" .Values.minio.serviceName -}}
{{- $port := default 9000 .Values.minio.port | int -}}
{{- printf "http://%s-%s:%d" .Release.Name $name $port -}}
{{- end -}}

{{/*
Minio has it's own secret mounting procedure, so it receives more special attention compared to normal objectStorage secret mounting.
*/}}
{{- define "gitlab.minio.mountSecrets" -}}
# mount secret for minio
{{- if .Values.global.minio.enabled }}
- secret:
    name: {{ template "gitlab.minio.credentials.secret" . }}
    items:
      - key: accesskey
        path: minio/accesskey
      - key: secretkey
        path: minio/secretkey
{{- end -}}
{{- end -}}{{/* "gitlab.minio.mountSecrets" */}}

