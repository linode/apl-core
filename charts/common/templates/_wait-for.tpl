{{- define "waitForUrl.init" }}
{{- if .url }}
{{- $retries := .retries | default "10" -}}
- name: wait-for-init
  image: {{ printf "otomi/core:%s" .otomiVersion }}
  {{- include "common.resources" . | nindent 2 }}
  command: ["sh"]
  env:
    - name: VERBOSITY
      value: "1"
  args:
    - '-c'
    - {{ if .skipTlsVerify }}NODE_TLS_REJECT_UNAUTHORIZED='0'{{ end }} binzx/otomi wait-for {{ .url }}
{{- end }}
{{- end }}