{{/*
Renders the serviceMonitor objects required by the chart.
*/}}
{{- define "bjw-s.common.render.serviceMonitors" -}}
  {{- /* Generate named services as required */ -}}
  {{- range $name, $serviceMonitor := .Values.serviceMonitor -}}
    {{- if $serviceMonitor.enabled -}}
      {{- $serviceMonitorValues := $serviceMonitor -}}

      {{- if and (not $serviceMonitorValues.nameOverride) (ne $name "main") -}}
        {{- $_ := set $serviceMonitorValues "nameOverride" $name -}}
      {{- end -}}

      {{/* Include the serviceMonitor class */}}
      {{- $_ := set $ "ObjectValues" (dict "serviceMonitor" $serviceMonitorValues) -}}
      {{- include "bjw-s.common.class.serviceMonitor" $ | nindent 0 -}}
      {{- $_ := unset $.ObjectValues "serviceMonitor" -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
