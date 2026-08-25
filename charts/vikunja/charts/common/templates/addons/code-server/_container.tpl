{{/*
The code-server sidecar container to be inserted.
*/}}
{{- define "bjw-s.common.addon.codeserver.container" -}}
{{- if lt (len .Values.addons.codeserver.volumeMounts) 1 }}
{{- fail "At least 1 volumeMount is required for codeserver container" }}
{{- end -}}
name: codeserver
image: "{{ .Values.addons.codeserver.image.repository }}:{{ .Values.addons.codeserver.image.tag }}"
imagePullPolicy: {{ .Values.addons.codeserver.pullPolicy }}
{{- with .Values.addons.codeserver.securityContext }}
securityContext:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.addons.codeserver.env }}
env:
{{- range $k, $v := . }}
  - name: {{ $k }}
    value: {{ $v | quote }}
{{- end }}
{{- end }}
ports:
- name: codeserver
  containerPort: {{ .Values.addons.codeserver.service.ports.codeserver.port }}
  protocol: TCP
args:
{{- range .Values.addons.codeserver.args }}
- {{ . | quote }}
{{- end }}
- "--port"
- "{{ .Values.addons.codeserver.service.ports.codeserver.port }}"
- {{ .Values.addons.codeserver.workingDir | default (first .Values.addons.codeserver.volumeMounts).mountPath }}
volumeMounts:
{{- with .Values.addons.codeserver.volumeMounts }}
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- if or .Values.addons.codeserver.git.deployKey .Values.addons.codeserver.git.deployKeyBase64 .Values.addons.codeserver.git.deployKeySecret }}
  - name: deploykey
    mountPath: /root/.ssh/id_rsa
    subPath: id_rsa
{{- end }}
{{- with .Values.addons.codeserver.resources }}
resources:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end -}}
