{{/*
adminApi imagePullSecrets
*/}}
{{- define "tempo.adminApiImagePullSecrets" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.adminApi.image "global" .Values.global.image -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
