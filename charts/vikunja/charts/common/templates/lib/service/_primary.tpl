{{/*
Return the primary service object
*/}}
{{- define "bjw-s.common.lib.service.primary" -}}
  {{- $enabledServices := (include "bjw-s.common.lib.service.enabledServices" $ | fromYaml ) }}

  {{- $result := "" -}}
  {{- range $name, $service := $enabledServices -}}
    {{- if and (hasKey $service "primary") $service.primary -}}
      {{- $result = $name -}}
    {{- end -}}
  {{- end -}}

  {{- if not $result -}}
    {{- $result = keys $enabledServices | first -}}
  {{- end -}}
  {{- $result -}}
{{- end -}}
