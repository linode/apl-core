{{/*
ingester imagePullSecrets
*/}}
{{- define "tempo.ingesterImagePullSecrets" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.ingester.image "global" .Values.global.image -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
