{{/*
Generates a templated object storage config.

Usage:
{{ include "gitlab.appConfig.objectStorage.configuration" ( \
     dict                                                   \
         "name" "STORAGE_NAME"                              \
         "config" .Values.path.to.objectstorage.config      \
         "context" $                                        \
     ) }}
*/}}
{{- define "gitlab.appConfig.objectStorage.configuration" -}}
object_store:
  enabled: true
  remote_directory: {{ .config.bucket }}
  direct_upload: true
  background_upload: false
  proxy_download: {{ or (not (kindIs "bool" .config.proxy_download)) .config.proxy_download }}
  {{- if .config.connection }}
  connection: <%= YAML.load_file("/etc/gitlab/objectstorage/{{ .name }}").to_json() %>
  {{- else if .context.Values.global.minio.enabled }}
  connection:
    provider: AWS
    region: us-east-1
    aws_access_key_id: "<%= File.read('/etc/gitlab/minio/accesskey').strip.dump[1..-2] %>"
    aws_secret_access_key: "<%= File.read('/etc/gitlab/minio/secretkey').strip.dump[1..-2] %>"
    host: {{ template "gitlab.minio.hostname" .context }}
    endpoint: {{ template "gitlab.minio.endpoint" .context }}
    path_style: true
  {{- end -}}
{{- end -}}{{/* "gitlab.appConfig.objectStorage.configuration" */}}


{{/*
Generates a templated object storage config.

Usage:
{{ include "gitlab.appConfig.objectStorage.mountSecrets" ( \
     dict                                                  \
         "name" "STORAGE_NAME"                             \
         "config" .Values.path.to.objectstorage.config     \
     ) }}
*/}}
{{- define "gitlab.appConfig.objectStorage.mountSecrets" -}}
# mount secret for {{ .name }}
{{- if .config.connection }}
- secret:
    name: {{ .config.connection.secret }}
    items:
      - key: {{ default "connection" .config.connection.key }}
        path: objectstorage/{{ .name }}
{{- end -}}
{{- end -}}{{/* "gitlab.appConfig.objectStorage.mountSecrets" */}}
