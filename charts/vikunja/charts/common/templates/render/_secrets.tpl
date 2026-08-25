{{/*
Renders the Secret objects required by the chart.
*/}}
{{- define "bjw-s.common.render.secrets" -}}
  {{- /* Generate named Secrets as required */ -}}
  {{- range $name, $secret := .Values.secrets -}}
    {{- if $secret.enabled -}}
      {{- $secretValues := $secret -}}

      {{- /* set the default nameOverride to the Secret name */ -}}
      {{- if not $secretValues.nameOverride -}}
        {{- $_ := set $secretValues "nameOverride" $name -}}
      {{ end -}}

      {{- $_ := set $ "ObjectValues" (dict "secret" $secretValues) -}}
      {{- include "bjw-s.common.class.secret" $ | nindent 0 -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
