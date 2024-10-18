{{/*
tokengen-job imagePullSecrets
*/}}
{{- define "tempo.tokengenJobImagePullSecrets" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.tokengenJob.image "global" .Values.global.image -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
