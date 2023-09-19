{{/*
query image
*/}}
{{- define "tempo.queryImage" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.queryFrontend.query.image "global" .Values.global.image "defaultVersion" .Chart.AppVersion -}}
{{- include "tempo.tempoImage" $dict -}}
{{- end }}

{{/*
queryFrontend imagePullSecrets
*/}}
{{- define "tempo.queryFrontendImagePullSecrets" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.queryFrontend.image "global" .Values.global.image -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}

{{/*
query imagePullSecrets
*/}}
{{- define "tempo.queryImagePullSecrets" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.queryFrontend.query.image "global" .Values.global.image -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
