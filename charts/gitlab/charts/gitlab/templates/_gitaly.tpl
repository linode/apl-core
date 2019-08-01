{{/* ######### Gitaly related templates */}}

{{/*
Return gitaly host for internal statefulsets
*/}}
{{- define "gitlab.gitaly.storage.internal" -}}
{{- $releaseName := .Release.Name -}}
{{- $name := coalesce .Values.gitaly.serviceName .Values.global.gitaly.serviceName "gitaly" -}}
{{- range $i, $storage := .Values.global.gitaly.internal.names -}}
{{- printf "%s:\n" $storage -}}
{{- printf  "path: /var/opt/gitlab/repo\n" | indent 2 -}}
{{- $podName := printf "%s-gitaly-%d" $releaseName $i -}}
{{- printf "gitaly_address: tcp://%s.%s-%s:%d\n" $podName $releaseName $name 8075 -}}
{{- end -}}
{{- end -}}


{{/*
Return gitaly storage for external hosts
*/}}
{{- define "gitlab.gitaly.storage.external" -}}
{{- range $i, $storage := .Values.global.gitaly.external -}}
{{- printf "%s:\n" $storage.name -}}
{{- printf  "path: /var/opt/gitlab/repo\n" | indent 2 -}}
{{- printf "gitaly_address: tcp://%s:%v\n" $storage.hostname (default 8075 $storage.port) -}}
{{- end -}}
{{- end -}}


{{/*
Return the gitaly storages list
*/}}
{{- define "gitlab.gitaly.storages" -}}
{{- if .Values.global.gitaly.host -}}
default:
  path: /var/opt/gitlab/repo
  gitaly_address: {{ printf "tcp://%s:%d" .Values.global.gitaly.host (default 8075 .Values.global.gitaly.port) }}
{{- else -}}
{{- if .Values.global.gitaly.external -}}
{{ template "gitlab.gitaly.storage.external" . }}
{{- end -}}
{{- if .Values.global.gitaly.internal.names -}}
{{ template "gitlab.gitaly.storage.internal" . }}
{{- end -}}
{{- end -}}
{{- end -}}
