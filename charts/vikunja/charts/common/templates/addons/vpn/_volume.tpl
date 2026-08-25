{{/*
The volume (referencing VPN scripts) to be inserted into additionalVolumes.
*/}}
{{- define "bjw-s.common.addon.vpn.scriptsVolumeSpec" -}}
{{- if or .Values.addons.vpn.scripts.up .Values.addons.vpn.scripts.down -}}
configMap:
  name: {{ include "bjw-s.common.lib.chart.names.fullname" . }}-addon-vpn
  items:
    {{- if .Values.addons.vpn.scripts.up }}
    - key: up.sh
      path: up.sh
      mode: 0777
    {{- end }}
    {{- if .Values.addons.vpn.scripts.down }}
    - key: down.sh
      path: down.sh
      mode: 0777
    {{- end }}
{{- end -}}
{{- end -}}

{{/*
The volume (referencing VPN config) to be inserted into additionalVolumes.
*/}}
{{- define "bjw-s.common.addon.vpn.configVolumeSpec" -}}
{{- if or .Values.addons.vpn.configFile .Values.addons.vpn.configFileSecret -}}
secret:
  {{- if .Values.addons.vpn.configFileSecret }}
  secretName: {{ .Values.addons.vpn.configFileSecret }}
  {{- else }}
  secretName: {{ include "bjw-s.common.lib.chart.names.fullname" . }}-addon-vpn-config
  {{- end }}
  items:
    - key: vpnConfigfile
      path: vpnConfigfile
{{- end -}}
{{- end -}}
