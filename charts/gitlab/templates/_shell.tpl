{{/*
Return the gitlab-shell authToken secret name
*/}}
{{- define "gitlab.gitlab-shell.authToken.secret" -}}
{{- default (printf "%s-gitlab-shell-secret" .Release.Name) .Values.global.shell.authToken.secret | quote -}}
{{- end -}}

{{/*
Return the gitlab-shell authToken secret key
*/}}
{{- define "gitlab.gitlab-shell.authToken.key" -}}
{{- coalesce .Values.global.shell.authToken.key "secret" | quote -}}
{{- end -}}

{{/*
Return the gitlab-shell host keys secret name
*/}}
{{- define "gitlab.gitlab-shell.hostKeys.secret" -}}
{{- default (printf "%s-gitlab-shell-host-keys" .Release.Name) .Values.global.shell.hostKeys.secret | quote -}}
{{- end -}}

{{/*
Return the port to expose via Ingress/URLs

NOTE: All templates return _strings_, use as:
   {{ include "gitlab.shell.port"  $ | int }}
*/}}
{{- define "gitlab.shell.port" -}}
{{- if .Values.global.shell.port -}}
{{-   if eq 0 ( int .Values.global.shell.port ) -}}
{{-     printf "global.shell.port: '%s' is not an integer." .Values.global.shell.port | fail -}}
{{-   end -}}
{{- end -}}
{{ default 22 .Values.global.shell.port }}
{{- end -}}
