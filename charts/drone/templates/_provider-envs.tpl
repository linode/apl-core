{{- define "drone.providerEnvs" -}}
{{- if eq .Values.sourceControl.provider "github" -}}
- name: DRONE_GITHUB_CLIENT_ID
  value: {{ .Values.sourceControl.github.clientID }}
- name: DRONE_GITHUB_SERVER
  value: {{ .Values.sourceControl.github.server }}
- name: DRONE_GITHUB_CLIENT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ template "drone.sourceControlSecret" . }}
      key: {{ .Values.sourceControl.github.clientSecretKey }}
{{- end -}}
{{- if eq .Values.sourceControl.provider "gitlab" -}}
- name: DRONE_GITLAB_CLIENT_ID
  value: {{ .Values.sourceControl.gitlab.clientID }}
- name: DRONE_GITLAB_SERVER
  value: {{ .Values.sourceControl.gitlab.server }}
- name: DRONE_GITLAB_CLIENT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ template "drone.sourceControlSecret" . }}
      key: {{ .Values.sourceControl.gitlab.clientSecretKey }}
{{- end -}}
{{- if eq .Values.sourceControl.provider "gitea" -}}
- name: DRONE_GITEA_CLIENT_ID
  {{- if .Values.sourceControl.gitea.clientID }}
  value: {{ .Values.sourceControl.gitea.clientID }}
  {{- else }}
  valueFrom:
    secretKeyRef:
      name: drone-source-control
      key: clientId
  {{- end }}
- name: DRONE_GITEA_SERVER
  value: {{ .Values.sourceControl.gitea.server }}
- name: DRONE_GIT_USERNAME
  value: {{ .Values.sourceControl.username }}
- name: DRONE_GIT_PASSWORD
  value: {{ .Values.sourceControl.password | default .Values.server.adminToken | quote }}
- name: DRONE_GITEA_CLIENT_SECRET
  valueFrom:
    secretKeyRef:
      {{- if .Values.sourceControl.gitea.clientSecretKey }}
      name: {{ template "drone.sourceControlSecret" . }}
      key: {{ .Values.sourceControl.gitea.clientSecretKey }}
      {{- else }}
      name: drone-source-control
      key: clientSecret
      {{- end }}
{{- end -}}
{{- if eq .Values.sourceControl.provider "gogs" -}}
- name: DRONE_GOGS_SERVER
  value: {{ .Values.sourceControl.gogs.server }}
{{- end -}}
{{- if eq .Values.sourceControl.provider "bitbucketCloud" -}}
- name: DRONE_BITBUCKET_CLIENT_ID
  value: {{ .Values.sourceControl.bitbucketCloud.clientID }}
- name: DRONE_BITBUCKET_CLIENT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ template "drone.sourceControlSecret" . }}
      key: {{ .Values.sourceControl.bitbucketCloud.clientSecretKey }}
{{- end -}}
{{- if eq .Values.sourceControl.provider "bitbucketServer" -}}
- name: DRONE_STASH_SERVER
  value: {{ .Values.sourceControl.bitbucketServer.server }}
- name: DRONE_GIT_USERNAME
  value: {{ .Values.sourceControl.bitbucketServer.username }}
- name: DRONE_GIT_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ template "drone.sourceControlSecret" . }}
      key: {{ .Values.sourceControl.bitbucketServer.passwordKey }}
- name: DRONE_STASH_CONSUMER_KEY
  valueFrom:
    secretKeyRef:
      name: {{ template "drone.sourceControlSecret" . }}
      key: {{ .Values.sourceControl.bitbucketServer.consumerKey }}
- name: DRONE_STASH_PRIVATE_KEY
  value: /etc/bitbucket/key.pem
{{- end -}}
{{- end -}}

{{/*
Check if a valid source control provider has been set
*/}}
{{- define "drone.providerOK" -}}
{{- if .Values.sourceControl.provider -}}
  {{- if eq .Values.sourceControl.provider "github" -}}
    {{- if and .Values.sourceControl.github.server .Values.sourceControl.github.clientID -}}
      true
    {{- end -}}
  {{- else if eq .Values.sourceControl.provider "gitlab" -}}
    {{- if and .Values.sourceControl.gitlab.server .Values.sourceControl.gitlab.clientID -}}
      true
    {{- end -}}
  {{- else if eq .Values.sourceControl.provider "gitea" -}}
      true
  {{- else if eq .Values.sourceControl.provider "gogs" -}}
    {{- if .Values.sourceControl.gogs.server -}}
      true
    {{- end -}}
  {{- else if eq .Values.sourceControl.provider "bitbucketCloud" -}}
    {{- if .Values.sourceControl.bitbucketCloud.clientID -}}
      true
    {{- end -}}
  {{- else if eq .Values.sourceControl.provider "bitbucketServer" -}}
    {{- if and .Values.sourceControl.bitbucketServer.server .Values.sourceControl.bitbucketServer.username -}}
      true
    {{- end -}}
{{- end -}}
{{- end -}}
{{- end -}}
