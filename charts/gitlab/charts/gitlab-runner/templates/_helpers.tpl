{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "gitlab-runner.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "gitlab-runner.fullname" -}}
{{-   if .Values.fullnameOverride -}}
{{-     .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{-   else -}}
{{-     $name := default .Chart.Name .Values.nameOverride -}}
{{-     printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{-   end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "gitlab-runner.chart" -}}
{{-   printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Define the name of the secret containing the tokens
*/}}
{{- define "gitlab-runner.secret" -}}
{{- default (include "gitlab-runner.fullname" .) .Values.runners.secret | quote -}}
{{- end -}}

{{/*
Define the name of the s3 cache secret
*/}}
{{- define "gitlab-runner.cache.secret" -}}
{{- default "s3access" .Values.runners.cache.secretName | quote -}}
{{- end -}}

{{/*
Template for outputing the gitlabUrl
*/}}
{{- define "gitlab-runner.gitlabUrl" -}}
{{- .Values.gitlabUrl | quote -}}
{{- end -}}

{{/*
Template runners.cache.s3ServerAddress in order to allow overrides from external charts.
*/}}
{{- define "gitlab-runner.cache.s3ServerAddress" }}
{{- default "" .Values.runners.cache.s3ServerAddress | quote -}}
{{- end -}}

{{/*
Define the image, using .Chart.AppVersion and GitLab Runner image as a default value
*/}}
{{- define "gitlab-runner.image" }}
{{- $image := printf "gitlab/gitlab-runner:alpine-v%s" .Chart.AppVersion -}}
{{- default $image .Values.image}}
{{- end -}}
