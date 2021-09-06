{{- define "waitForUrl.init" }}
{{- if .url }}
{{- $skiptls := .SKIP_TLS_VERIFY | default "false" -}}
{{- $retries := .retries | default "10" -}}
- name: wait-for-init
  image: {{ printf "otomi/core:%s" .otomiVersion }}
  {{- include "common.resources" . | nindent 2 }}
  command: ["sh"]
  env:
    - name: VERBOSITY
      value: "2"
  args:
    - '-c'
    - binzx/otomi wait-for {{ .url }} {{ printf "--skip-ssl=%t" $skiptls }} {{ printf "--retries=%s" $retries }}
{{- end }}
{{- end }}