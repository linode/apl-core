{{/*
Environment variables used by containers.
*/}}
{{- define "bjw-s.common.lib.container.envVars" -}}
  {{- $values := .Values.env -}}
  {{- if hasKey . "ObjectValues" -}}
    {{- with .ObjectValues.envVars -}}
      {{- $values = . -}}
    {{- end -}}
  {{- end -}}

  {{- with $values -}}
    {{- $result := list -}}
    {{- range $k, $v := . -}}
      {{- $name := $k -}}
      {{- $value := $v -}}
      {{- if kindIs "int" $name -}}
        {{- $name = required "environment variables as a list of maps require a name field" $value.name -}}
      {{- end -}}

      {{- if kindIs "map" $value -}}
        {{- if hasKey $value "value" -}}
          {{- $envValue := $value.value | toString -}}
          {{- $result = append $result (dict "name" $name "value" (tpl $envValue $)) -}}
        {{- else if hasKey $value "valueFrom" -}}
          {{- $result = append $result (dict "name" $name "valueFrom" $value.valueFrom) -}}
        {{- else -}}
          {{- $result = append $result (dict "name" $name "valueFrom" $value) -}}
        {{- end -}}
      {{- end -}}
      {{- if not (kindIs "map" $value) -}}
        {{- if kindIs "string" $value -}}
          {{- $result = append $result (dict "name" $name "value" (tpl $value $)) -}}
        {{- else if or (kindIs "float64" $value) (kindIs "bool" $value) -}}
          {{- $result = append $result (dict "name" $name "value" ($value | toString)) -}}
        {{- else -}}
          {{- $result = append $result (dict "name" $name "value" $value) -}}
        {{- end -}}
      {{- end -}}
    {{- end -}}
    {{- toYaml (dict "env" $result) | nindent 0 -}}
  {{- end -}}
{{- end -}}
