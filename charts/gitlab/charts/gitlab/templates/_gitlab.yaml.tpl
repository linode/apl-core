{{- define "gitlab.appConfig.gitaly" -}}
gitaly:
  client_path: /home/git/gitaly/bin
  token: "<%= File.read('/etc/gitlab/gitaly/gitaly_token').strip.dump[1..-2] %>"
{{- end -}}

{{- define "gitlab.appConfig.repositories" -}}
repositories:
  storages: # You must have at least a `default` storage path.
{{ include "gitlab.gitaly.storages" . | indent 4 }}
{{- end -}}


{{- define "gitlab.appConfig.incoming_email" -}}
incoming_email:
  enabled: {{ eq .incomingEmail.enabled true }}
  address: {{ .incomingEmail.address | quote }}
{{- end -}}

{{- define "gitlab.appConfig.shell" -}}
gitlab_shell:
  path: /home/git/gitlab-shell/
  hooks_path: /home/git/gitlab-shell/hooks/
  upload_pack: true
  receive_pack: true
{{- end -}}

{{- define "gitlab.appConfig.shell.ssh_port" -}}
ssh_port: {{ include "gitlab.shell.port" . | int }}
{{- end -}}

{{- define "gitlab.appConfig.shell.secret_file" -}}
secret_file: /etc/gitlab/shell/.gitlab_shell_secret
{{- end -}}

{{- define "gitlab.appConfig.extra" -}}
extra:
  {{ if .extra.googleAnalyticsId }}
  google_analytics_id: {{ .extra.googleAnalyticsId | quote }}
  {{- end }}
  {{ if .extra.piwik_url }}
  piwik_url: {{ .extra.piwikUrl | quote }}
  {{- end }}
  {{ if .extra.piwik_site_id }}
  piwik_site_id: {{ .extra.piwikSiteId | quote }}
  {{- end }}
{{- end -}}

{{- define "gitlab.appConfig.rackAttack" -}}
rack_attack:
  git_basic_auth:
    {{- if .Values.rack_attack.git_basic_auth.enabled }}
  {{ toYaml .Values.rack_attack.git_basic_auth | indent 2 }}
    {{- end }}
{{- end -}}

{{- define "gitlab.appConfig.cronJobs" -}}
{{- if .cron_jobs }}
cron_jobs:
{{ toYaml .cron_jobs | indent 2 }}
{{- end }}
{{- end }}
