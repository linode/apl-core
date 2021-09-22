{{- define "waitForUrl.init" }}
{{- if .url }}
{{- $retries := .retries | default "10" -}}
- name: wait-for-init
  image: {{ printf "otomi/core:%s" .otomiVersion }}
  {{- include "common.resources" . | nindent 2 }}
  command: ["sh"]
  env:
    - name: VERBOSITY
      value: "2"
    {{- if ne .extraRootCA "" }}
    - name: NODE_EXTRA_CA_CERTS
      value: /etc/ssl/certs/ca-certificates.crt
    {{- end }}
  args:
    - '-c'
    - binzx/otomi wait-for {{ .url }}
  volumeMounts:
    {{- if ne .extraRootCA "" }}
    {{- include "extraRootCA.volumeMounts" (dict "rootCA" .extraRootCA) | nindent 6 }}
    {{- end }}
{{- end }}
{{- end }}