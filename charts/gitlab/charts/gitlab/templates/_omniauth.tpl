{{- define "gitlab.appConfig.omniauth.configuration" -}}
{{ with $.Values.global.appConfig }}
omniauth:
  enabled: {{ .omniauth.enabled }}
  {{- if .omniauth.autoSignInWithProvider }}
  auto_sign_in_with_provider: {{ .omniauth.autoSignInWithProvider | quote }}
  {{- end }}
  sync_profile_from_provider: {{ toJson .omniauth.syncProfileFromProvider }}
  sync_profile_attributes: {{ toJson .omniauth.syncProfileAttributes }}
  allow_single_sign_on: {{ toJson .omniauth.allowSingleSignOn }}
  block_auto_created_users: {{ .omniauth.blockAutoCreatedUsers }}
  auto_link_ldap_user: {{ .omniauth.autoLinkLdapUser }}
  auto_link_saml_user: {{ .omniauth.autoLinkSamlUser }}
  external_providers: {{ .omniauth.externalProviders }}
  {{- if .omniauth.providers }}
  providers:
  {{-   range $index, $entry := .omniauth.providers }}
    - <%= YAML.load_file({{ printf "/etc/gitlab/omniauth/%s/%s" $entry.secret (default "provider" $entry.key) | quote }}).to_json() %>
  {{-   end }}
  {{- end }}
{{- end -}}
{{- end -}}{{/* "gitlab.appConfig.omniauth.configuration" */}}

{{- define "gitlab.appConfig.omniauth.mountSecrets" -}}
{{- with $.Values.global.appConfig -}}
{{- if .omniauth.providers }}
{{-   range $index, $entry := .omniauth.providers }}
- secret:
    name: {{ $entry.secret }}
    items:
      - key: {{ default "provider" $entry.key }}
        path: {{ printf "omniauth/%s/%s" $entry.secret (default "provider" $entry.key) | quote }}
{{-   end }}
{{- end -}}
{{- end -}}
{{- end -}}{{/* "gitlab.appConfig.omniauth.mountSecrets" */}}
