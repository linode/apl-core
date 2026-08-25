{{/* Return the name of the primary route object */}}
{{- define "bjw-s.common.lib.route.primary" -}}
  {{- $enabledRoutes := dict -}}
  {{- range $name, $route := .Values.route -}}
    {{- if $route.enabled -}}
      {{- $_ := set $enabledRoutes $name . -}}
    {{- end -}}
  {{- end -}}

  {{- $result := "" -}}
  {{- range $name, $route := $enabledRoutes -}}
    {{- if and (hasKey $route "primary") $route.primary -}}
      {{- $result = $name -}}
    {{- end -}}
  {{- end -}}

  {{- if not $result -}}
    {{- $result = keys $enabledRoutes | first -}}
  {{- end -}}
  {{- $result -}}
{{- end -}}
