{{/*
bloom gateway fullname
*/}}
{{- define "loki.bloomGatewayFullname" -}}
{{ include "loki.fullname" . }}-bloom-gateway
{{- end }}

{{/*
bloom gateway common labels
*/}}
{{- define "loki.bloomGatewayLabels" -}}
{{ include "loki.labels" . }}
app.kubernetes.io/component: bloom-gateway
{{- end }}

{{/*
bloom gateway selector labels
*/}}
{{- define "loki.bloomGatewaySelectorLabels" -}}
{{ include "loki.selectorLabels" . }}
app.kubernetes.io/component: bloom-gateway
{{- end }}
