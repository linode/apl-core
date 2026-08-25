{{/*
Template to render VPN addon
It will include / inject the required templates based on the given values.
*/}}
{{- define "bjw-s.common.addon.vpn" -}}
{{- if .Values.addons.vpn.enabled -}}
  {{- if eq "gluetun" .Values.addons.vpn.type -}}
    {{- include "bjw-s.common.addon.gluetun" . }}
  {{- end -}}

  {{/* Include the configmap if not empty */}}
  {{- if or .Values.addons.vpn.scripts.up .Values.addons.vpn.scripts.down }}
    {{- $configmap := include "bjw-s.common.addon.vpn.configmap" . -}}
    {{- if $configmap -}}
      {{- $_ := set .Values.configMaps "addon-vpn" (dict "enabled" true "data" ($configmap | fromYaml)) -}}
    {{- end -}}
  {{- end -}}

  {{/* Include the secret if not empty */}}
  {{- if and .Values.addons.vpn.configFile (not .Values.addons.vpn.configFileSecret) }}
    {{- $secret := include "bjw-s.common.addon.vpn.secret" . -}}
    {{- if $secret -}}
      {{- $_ := set .Values.secrets "addon-vpn-config" (dict "enabled" true "stringData" ($secret | fromYaml)) -}}
    {{- end -}}
  {{- end -}}

  {{/* Append the vpn scripts volume to the volumes */}}
  {{- $scriptVolume := include "bjw-s.common.addon.vpn.scriptsVolumeSpec" . | fromYaml -}}
  {{- if $scriptVolume -}}
    {{- $_ := set .Values.persistence "vpnscript" (dict "enabled" true "mountPath" "-" "type" "custom" "volumeSpec" $scriptVolume) -}}
  {{- end -}}

  {{/* Append the vpn config volume to the volumes */}}
  {{- $configVolume := include "bjw-s.common.addon.vpn.configVolumeSpec" . | fromYaml }}
  {{ if $configVolume -}}
    {{- $_ := set .Values.persistence "vpnconfig" (dict "enabled" true "mountPath" "-" "type" "custom" "volumeSpec" $configVolume) -}}
  {{- end -}}

  {{/* Include the networkpolicy if not empty */}}
  {{- $networkpolicy := include "bjw-s.common.addon.vpn.networkpolicy" . -}}
  {{- if $networkpolicy -}}
    {{- $networkpolicy | nindent 0 -}}
  {{- end -}}
{{- end -}}
{{- end -}}
