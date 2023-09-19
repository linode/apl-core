{{/*
compactor imagePullSecrets
*/}}
{{- define "tempo.compactorImagePullSecrets" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.compactor.image "global" .Values.global.image -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
