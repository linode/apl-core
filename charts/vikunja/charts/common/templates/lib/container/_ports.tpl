{{/*
Ports included by the controller.
*/}}
{{- define "bjw-s.common.lib.container.ports" -}}
  {{- $ports := list -}}
  {{- range $servicename, $service := .Values.service -}}
    {{- $serviceEnabled := true -}}
    {{- if hasKey $service "enabled" -}}
      {{- $serviceEnabled = $service.enabled -}}
    {{- end -}}
    {{- if $serviceEnabled -}}
      {{- $enabledPorts := include "bjw-s.common.lib.service.enabledPorts" (dict "serviceName" $servicename "values" $service) | fromYaml }}
      {{- range $portname, $port := ($enabledPorts | default dict) -}}
        {{- $_ := set $port "name" $portname -}}
        {{- $ports = mustAppend $ports $port -}}
      {{- end -}}
    {{- end -}}
  {{- end -}}

{{/* export/render the list of ports */}}
{{- if $ports -}}
{{- range $_ := $ports }}
{{- if default true .enabled | }}
- name: {{ .name }}
  {{- if and .targetPort (kindIs "string" .targetPort) }}
  {{- fail (printf "Our charts do not support named ports for targetPort. (port name %s, targetPort %s)" .name .targetPort) }}
  {{- end }}
  containerPort: {{ .targetPort | default .port }}
  {{- if .protocol }}
  {{- if or ( eq .protocol "HTTP" ) ( eq .protocol "HTTPS" ) ( eq .protocol "TCP" ) }}
  protocol: TCP
  {{- else }}
  protocol: {{ .protocol }}
  {{- end }}
  {{- else }}
  protocol: TCP
  {{- end }}
{{- end}}
{{- end -}}
{{- end -}}
{{- end -}}
