{{/*
distributor imagePullSecrets
*/}}
{{- define "tempo.distributorImagePullSecrets" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.distributor.image "global" .Values.global.image -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
