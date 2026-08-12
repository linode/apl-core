{{/*
expects global context
*/}}
{{- define "loki.ingester.replicaCount" -}}
{{- ceil (divf .Values.ingester.replicas 3) -}}
{{- end -}}

{{/*
expects a dict
{
  "replicas": replicas in a zone,
  "ctx": global context
}
*/}}
{{- define "loki.ingester.maxUnavailable" -}}
{{- max 1 (ceil (mulf .replicas (divf (int .ctx.Values.ingester.zoneAwareReplication.maxUnavailablePct) 100))) -}}
{{- end -}}

{{/*
Return rollout-group prefix if it is set
*/}}
{{- define "loki.prefixRolloutGroup" -}}
{{- if .Values.ingester.rolloutGroupPrefix -}}
{{- .Values.ingester.rolloutGroupPrefix -}}-
{{- end -}}
{{- end -}}

{{/*
Return ingester name prefix if required
*/}}
{{- define "loki.prefixIngesterName" -}}
{{- if .Values.ingester.addIngesterNamePrefix -}}
loki-
{{- end -}}
{{- end -}}
