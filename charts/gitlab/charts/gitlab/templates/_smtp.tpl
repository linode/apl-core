{{/* ######### SMTP templates */}}

{{/*
  Generates smtp settings for ActionMailer to be used in unicorn and sidekiq
*/}}
{{- define "gitlab.smtp_settings" -}}
{{- if .Values.global.smtp.enabled -}}
Rails.application.config.action_mailer.delivery_method = :smtp

ActionMailer::Base.delivery_method = :smtp
ActionMailer::Base.smtp_settings = {
  address: {{ .Values.global.smtp.address | quote }},
  port: {{ .Values.global.smtp.port | int }},
  ca_file: "/etc/ssl/certs/ca-certificates.crt",
  {{- if .Values.global.smtp.domain }}
  domain: {{ .Values.global.smtp.domain | quote }},
  {{- end }}
  {{ if has .Values.global.smtp.authentication (list "login" "plain" "cram_md5") }}
  authentication: :{{.Values.global.smtp.authentication}},
  user_name: {{ .Values.global.smtp.user_name | quote }},
  password: File.read("/etc/gitlab/smtp/smtp-password").strip,
  {{- end }}
  {{- if .Values.global.smtp.starttls_auto }}
  enable_starttls_auto: true,
  {{- else }}
  enable_starttls_auto: false,
  {{- end }}
  {{- if has .Values.global.smtp.tls (list true false) }}
  tls: {{ .Values.global.smtp.tls }},
  {{- end }}
  {{- if eq .Values.global.smtp.openssl_verify_mode "peer" }}
  openssl_verify_mode: 'peer'
  {{- else if eq .Values.global.smtp.openssl_verify_mode "none" }}
  openssl_verify_mode: 'none'
  {{- else if eq .Values.global.smtp.openssl_verify_mode "ssl/tls" }}
  openssl_verify_mode: :ssl/:tls
  {{- end }}
}
{{- end -}}
{{- end -}}

{{/* Default from address for emails based on domain */}}
{{- define "gitlab.email.from" -}}
{{ .Values.global.email.from | default (printf "gitlab@%s" .Values.global.hosts.domain ) | quote -}}
{{- end -}}

{{/* Default replyto address for emails based on domain */}}
{{- define "gitlab.email.reply_to" -}}
{{ .Values.global.email.reply_to | default (printf "noreply@%s" .Values.global.hosts.domain ) | quote -}}
{{- end -}}
