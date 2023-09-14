{{/*
querier imagePullSecrets
*/}}
{{- define "tempo.querierImagePullSecrets" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.querier.image "global" .Values.global.image -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
