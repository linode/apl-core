{{/*
gateway auth secret name
*/}}
{{- define "tempo.gatewayAuthSecret" -}}
{{ .Values.gateway.basicAuth.existingSecret | default (include "tempo.resourceName" (dict "ctx" . "component" "gateway")) }}
{{- end }}


{{/*
gateway image
*/}}
{{- define "tempo.gatewayImage" -}}
{{- $dict := dict "tempo" (dict) "service" .Values.gateway.image "global" .Values.global.image -}}
{{- include "tempo.tempoImage" $dict -}}
{{- end }}

{{/*
gateway imagePullSecrets
*/}}
{{- define "tempo.gatewayImagePullSecrets" -}}
{{- $dict := dict "component" .Values.gateway.image "global" .Values.global.image "tempo" (dict) -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
