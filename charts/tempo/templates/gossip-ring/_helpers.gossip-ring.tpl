{{/*
gossip-ring selector labels
*/}}
{{- define "tempo.gossipRingSelectorLabels" -}}
{{ include "tempo.selectorLabels" . }}
app.kubernetes.io/part-of: memberlist
{{- end -}}

