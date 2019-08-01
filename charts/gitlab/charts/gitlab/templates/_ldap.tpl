{{- define "gitlab.appConfig.ldap.configuration" -}}
{{- if not .Values.global.appConfig.ldap.servers -}}
ldap:
  enabled: false
{{- else -}}
ldap:
  enabled: true
  servers:
    {{- range $serverName, $serverConfig := .Values.global.appConfig.ldap.servers -}}
      {{- include "gitlab.appConfig.ldap.servers.configuration" (dict "name" $serverName "config" $serverConfig) | nindent 4 -}}
    {{- end -}}
{{- end -}}
{{- end -}}{{/* "gitlab.appConfig.ldap.configuration" */}}

{{/*
Usage example:

{{ include "gitlab.appConfig.ldap.servers.configuration" (\
    dict \
        "name" <ServerName>
        "config" <ServerConfig>
    ) }}
*/}}
{{- define "gitlab.appConfig.ldap.servers.configuration" -}}
{{- $.name }}:
{{- toYaml (omit $.config "password") | trimSuffix "\n" | nindent 2 -}}
{{- if and $.config.password (not (kindIs "string" $.config.password ))}}
  password: "<%= File.read('/etc/gitlab/ldap/{{ $.name }}/password').strip.dump[1..-2] %>"
{{- end -}}
{{- end -}}{{/* gitlab.appConfig.ldap.servers.configuration */}}

{{- define "gitlab.appConfig.ldap.servers.mountSecrets" -}}
# mount secrets for LDAP
{{- if .Values.global.appConfig.ldap.servers -}}
{{-   range $name, $config := .Values.global.appConfig.ldap.servers -}}
{{-     if and $config.password (not (kindIs "string" $config.password ))}}
- secret:
    name: {{ $config.password.secret }}
    items:
      - key: {{ default "password" $config.password.key }}
        path: ldap/{{ $name }}/password
{{-     end -}}
{{-   end -}}
{{- end -}}
{{- end -}}{{/* "gitlab.appConfig.ldap.servers.mountSecrets" "*/}}
