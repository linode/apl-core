{{/*
The netshoot sidecar container to be inserted.
*/}}
{{- define "bjw-s.common.addon.netshoot.container" -}}
name: netshoot
image: "{{ .Values.addons.netshoot.image.repository }}:{{ .Values.addons.netshoot.image.tag }}"
imagePullPolicy: {{ .Values.addons.netshoot.pullPolicy }}
{{- with .Values.addons.netshoot.securityContext }}
securityContext:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.addons.netshoot.env }}
env:
{{- range $k, $v := . }}
  - name: {{ $k }}
    value: {{ $v | quote }}
{{- end }}
{{- end }}
command:
  - /bin/sh
  - -c
  - sleep infinity
{{- with .Values.addons.netshoot.resources }}
resources:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end -}}
