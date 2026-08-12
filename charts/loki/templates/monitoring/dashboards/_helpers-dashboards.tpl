{{/* Expand the name of the dashboards resources */}}
{{- define "loki.dashboardsName" -}}
{{- include "loki.name" . }}-dashboards
{{- end }}

{{/* To help configure Grafana operator folder settings (folder, folderUID, or folderRef) */}}
{{- define "loki.grafana.operator.folder" }}
{{- $folder := .Values.monitoring.dashboards.grafanaOperator.folder }}
{{- $folderUID := .Values.monitoring.dashboards.grafanaOperator.folderUID }}
{{- $folderRef := .Values.monitoring.dashboards.grafanaOperator.folderRef }}
{{- if not (or
  (and $folder (not $folderUID) (not $folderRef))
  (and (not $folder) $folderUID (not $folderRef))
  (and (not $folder) (not $folderUID) $folderRef)
)}}
{{- fail "monitoring.dashboards.grafanaOperator: only one of folder, folderUID, or folderRef must be set" }}
{{- end }}
{{- if $folder }}
folder: {{ $folder | quote }}
{{- else if $folderUID }}
folderUID: {{ $folderUID | quote }}
{{- else if $folderRef }}
folderRef: {{ $folderRef | quote }}
{{- end }}
{{- end }}
