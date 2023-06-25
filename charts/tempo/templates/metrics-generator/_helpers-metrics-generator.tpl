{{/*
metrics-generator imagePullSecrets
*/}}
{{- define "tempo.metricsGeneratorImagePullSecrets" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.metricsGenerator.image "global" .Values.global.image -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
