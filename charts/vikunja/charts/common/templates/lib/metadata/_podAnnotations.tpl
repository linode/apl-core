{{/* Determine the Pod annotations used in the controller */}}
{{- define "bjw-s.common.lib.metadata.podAnnotations" -}}
  {{- if .Values.podAnnotations -}}
    {{- tpl (toYaml .Values.podAnnotations) . | nindent 0 -}}
  {{- end -}}

  {{- $configMapsFound := dict -}}
  {{- range $name, $configmap := .Values.configMaps -}}
    {{- if $configmap.enabled -}}
      {{- $_ := set $configMapsFound $name (toYaml $configmap.data | sha256sum) -}}
    {{- end -}}
  {{- end -}}
  {{- if $configMapsFound -}}
    {{- printf "checksum/config: %v" (toYaml $configMapsFound | sha256sum) | nindent 0 -}}
  {{- end -}}

  {{- $secretsFound := dict -}}
  {{- range $name, $secret := .Values.secrets -}}
    {{- if $secret.enabled -}}
      {{- $_ := set $secretsFound $name (toYaml $secret.data | sha256sum) -}}
    {{- end -}}
  {{- end -}}
  {{- if $secretsFound -}}
    {{- printf "checksum/secrets: %v" (toYaml $secretsFound | sha256sum) | nindent 0 -}}
  {{- end -}}
{{- end -}}
