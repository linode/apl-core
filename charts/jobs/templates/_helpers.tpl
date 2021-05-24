{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "jobs.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "jobs.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "jobs.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "jobs.labels" -}}
helm.sh/chart: {{ include "jobs.chart" . }}
{{ include "jobs.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "jobs.selectorLabels" -}}
app.kubernetes.io/name: {{ include "jobs.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "jobs.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "jobs.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{- define "itemsByName" -}}
{{- range $i := . }}
{{ $i.name }}: {{- $i | toYaml | nindent 2 }}
{{- end }}
{{- end -}}

{{- define "fileConfigMapName" -}}
{{ printf "job-%s" (. | replace "." "" | replace "/" "") }}
{{- end -}}

{{- define "podspec" -}}
{{- $v := .Values -}}
{{- $ := . }}
{{- $teamSecrets := (include "itemsByName" ($v.teamSecrets | default list) | fromYaml) -}}
{{- $podSecurityContext := $v.podSecurityContext | default (dict "runAsNonRoot" true "runAsUser" 1001 "runAsGroup" 1001) -}}
template:
  metadata:
    labels: {{- include "jobs.labels" . | nindent 6 }}
    annotations:
      checksum/secret: {{ include (print .Template.BasePath "/secret.yaml") . | sha256sum | trunc 63 }}
      checksum/config: {{ include (print .Template.BasePath "/configmap.yaml") . | sha256sum | trunc 63 }}
{{- range $key, $value := $v.annotations }}
      {{ $key }}: {{ $value | quote }}
{{- end }}
  spec:
    serviceAccountName: {{ $v.serviceAccountName | default "default" }}
    securityContext: {{- toYaml $podSecurityContext | nindent 6 }}
{{- range $item := list (dict "isInit" true "container" $v.init) (dict "isInit" false "container" $v) }}
  {{- $c := $item.container }}
  {{ $initSuffix := $item.isInit | ternary "-init" "" }}
  {{- if and $item.isInit $c }}
    initContainers:
  {{- end }}
  {{- if not $item.isInit }}
    containers:
  {{- end }}
  {{- if $c }}
      - image: {{ $c.image.repository }}:{{ $c.image.tag | default "latest" }}
        imagePullPolicy: {{ $c.image.pullPolicy | default "IfNotPresent"}}
        name: {{ $.Release.Name }}{{ $initSuffix }}
        command: ["{{ $c.shell | default "sh" }}", "-c"]
        resources: {{- toYaml (coalesce $c.resources $v.resources) | nindent 10 }}
        args:
          - |
            {{- toString $c.script | nindent 12 }}
    {{- if or $c.env $c.nativeSecrets }}
        envFrom:
      {{- if $c.env }}
        - configMapRef:
            name: {{ $.Release.Name }}{{ $initSuffix }}
      {{- end }}
      {{- if $c.nativeSecrets }}
        - secretRef:
            name: {{ $.Release.Name }}{{ $initSuffix }}
      {{- end }}
    {{- end }}
    {{- with $c.secrets }}
        env:
      {{- range $secret := . }} 
        {{- $entries := ($secret.entries | default (index $v.teamSecrets $secret.name)) }}
        {{- range $entry := $entries }}
          - name: {{ $entry | upper }}
            valueFrom:
              secretKeyRef:
                name: {{ $secret.name }}
                key: {{ $entry }}
        {{- end }}
      {{- end }}
    {{- end }}
    {{- with $c.securityContext }}
        securityContext: {{- toYaml . | nindent 10 }}
    {{- end }}
  {{- end }}
{{- end }}
    restartPolicy: Never
{{- with $v.files }}
    volumes:
  {{- range $location, $content := $v.files }}
      - name: {{ $.Release.Name }}-{{ include "fileConfigMapName" $location }}
        configMap:
          name: {{ $.Release.Name }}-{{ include "fileConfigMapName" $location }}
  {{- end }}
{{- end }}
backoffLimit: 3
ttlSecondsAfterFinished: {{ $v.ttlSecondsAfterFinished | default 86400 }}
{{- end -}}