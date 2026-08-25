{{/*
The gluetun sidecar container to be inserted.
*/}}
{{- define "bjw-s.common.addon.gluetun.container" -}}
name: gluetun
image: "{{ .Values.addons.vpn.gluetun.image.repository }}:{{ .Values.addons.vpn.gluetun.image.tag }}"
imagePullPolicy: {{ .Values.addons.vpn.gluetun.pullPolicy }}
{{- with .Values.addons.vpn.securityContext }}
securityContext:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.addons.vpn.env }}
env:
  {{- . | toYaml | nindent 2 }}
{{- end }}
{{- with .Values.addons.vpn.envFrom }}
envFrom:
  {{- . | toYaml | nindent 2 }}
{{- end }}
{{- with .Values.addons.vpn.args }}
args:
  {{- . | toYaml | nindent 2 }}
{{- end }}
{{- if or .Values.addons.vpn.configFile .Values.addons.vpn.configFileSecret .Values.addons.vpn.scripts.up .Values.addons.vpn.scripts.down .Values.addons.vpn.additionalVolumeMounts .Values.persistence.shared.enabled }}
volumeMounts:
{{- if or .Values.addons.vpn.configFile .Values.addons.vpn.configFileSecret }}
  - name: vpnconfig
    mountPath: /gluetun/config.conf
    subPath: vpnConfigfile
{{- end }}
{{- if .Values.addons.vpn.scripts.up }}
  - name: vpnscript
    mountPath: /gluetun/scripts/up.sh
    subPath: up.sh
{{- end }}
{{- if .Values.addons.vpn.scripts.down }}
  - name: vpnscript
    mountPath: /gluetun/scripts/down.sh
    subPath: down.sh
{{- end }}
{{- if .Values.persistence.shared.enabled }}
  - mountPath: {{ .Values.persistence.shared.mountPath }}
    name: shared
{{- end }}
{{- with .Values.addons.vpn.additionalVolumeMounts }}
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}
{{- with .Values.addons.vpn.livenessProbe }}
livenessProbe:
  {{- toYaml . | nindent 2 }}
{{- end -}}
{{- with .Values.addons.vpn.resources }}
resources:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end -}}
