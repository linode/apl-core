{{/*
enterpriseFederationFrontend imagePullSecrets
*/}}
{{- define "tempo.enterpriseFederationFrontendImagePullSecrets" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.enterpriseFederationFrontend.image "global" .Values.global.image -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
