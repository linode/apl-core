{{/*
Generates pseudonymizers' configuration.

Usage:
{{ include "gitlab.appConfig.pseudonymizer.configuration" $ }}
*/}}
{{- define "gitlab.appConfig.pseudonymizer.configuration" -}}
pseudonymizer:
  manifest: config/pseudonymizer.yml
  upload:
    remote_directory: {{ $.Values.global.appConfig.pseudonymizer.bucket }}
    {{- if $.Values.global.minio.enabled }}
    connection:
      provider: AWS
      region: us-east-1
      aws_access_key_id: "<%= File.read('/etc/gitlab/minio/accesskey').strip.dump[1..-2] %>"
      aws_secret_access_key: "<%= File.read('/etc/gitlab/minio/secretkey').strip.dump[1..-2] %>"
      host: {{ template "gitlab.minio.hostname" $ }}
      endpoint: {{ template "gitlab.minio.endpoint" $ }}
      path_style: true
    {{- else if $.Values.global.appConfig.pseudonymizer.connection }}
    connection: <%= YAML.load_file("/etc/gitlab/objectstorage/pseudonymizer").to_json() %>
    {{- end -}}
{{- end -}}{{/* "gitlab.appConfig.pseudonymizer.configuration" */}}


{{/*
Generates pseudonymizers' mount secrets.

Usage:
{{ include "gitlab.appConfig.pseudonymizer.mountSecrets" $ }}
*/}}
{{- define "gitlab.appConfig.pseudonymizer.mountSecrets" -}}
# mount secret for pseudonymizer
{{- if $.Values.global.appConfig.pseudonymizer.connection }}
- secret:
    name: {{ $.Values.global.appConfig.pseudonymizer.connection.secret }}
    items:
      - key: {{ default "connection" $.Values.global.appConfig.pseudonymizer.connection.key }}
        path: objectstorage/pseudonymizer
{{- end -}}
{{- end -}}{{/* "gitlab.appConfig.pseudonymizer.mountSecrets" */}}
