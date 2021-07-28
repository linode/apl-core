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

{{- define "flatten-name" -}}
{{ printf "job-%s" (. | replace "." "-" | replace "/" "-") }}
{{- end -}}

{{- define "podspec" -}}
{{- $v := .Values -}}
{{- $ := . }}
{{- $teamSecrets := (include "itemsByName" ($v.teamSecrets | default list) | fromYaml) -}}
{{- $podSecurityContext := $v.podSecurityContext | default (dict "runAsNonRoot" true "runAsUser" 1001 "runAsGroup" 1001) -}}
{{- $containers := list (dict "isInit" false "container" $v) }}
{{- $hasMounts := or $v.files $v.secretMounts }}
{{- range $vi := $v.init }}
  {{- $containers = prepend $containers (dict "isInit" true "container" $vi) }}
  {{- if or $vi.files $vi.SecretMounts }}{{ $hasMounts = true }}{{ end }}
{{ end }}
template:
  metadata:
    labels: {{- include "jobs.labels" . | nindent 6 }}
    annotations:
      checksum/secret: {{ include (print .Template.BasePath "/secret.yaml") . | sha256sum | trunc 63 }}
      checksum/config: {{ include (print .Template.BasePath "/configmap.yaml") . | sha256sum | trunc 63 }}
      sidecar.istio.io/inject: "false"
  {{- range $key, $value := $v.annotations }}
      {{ $key }}: {{ $value | quote }}
  {{- end }}
  spec:
    serviceAccountName: {{ $v.serviceAccountName | default "default" }}
    securityContext:
      {{- with $podSecurityContext }}
      {{- toYaml . | nindent 6 }}
      {{- else }}
      runAsNonRoot: true
      {{- end }}
  {{- range $item := $containers }}
    {{- $c := $item.container }}
    {{- $initSuffix := $item.isInit | ternary "-init" "" }}
    {{- if and $item.isInit $c }}
    initContainers:
    {{- end }}
    {{- if not $item.isInit }}
    containers:
    {{- end }}
    {{- if $c }}
      - image: {{ $c.image.repository | default $v.image.repository }}:{{ $c.image.tag | default (hasKey $c.image "repository" | ternary "latest" ($v.image.tag | default "latest")) }}
        imagePullPolicy: {{ $c.image.pullPolicy | default $v.image.pullPolicy | default "IfNotPresent"}}
        name: {{ $.Release.Name }}{{ $initSuffix }}
        command:
          - {{ $c.shell | default "/bin/sh" }}
          - -c
          - |
            {{- toString $c.script | nindent 12 }}
        resources: {{- toYaml (coalesce $c.resources $v.resources) | nindent 10 }}
      {{- if or $c.env $c.nativeSecrets }}
        envFrom:
        {{- if $c.env }}
        - configMapRef:
            name: {{ $.Release.Name }}-env{{ $initSuffix }}
        {{- end }}
        {{- if $c.nativeSecrets }}
        - secretRef:
            name: {{ $.Release.Name }}{{ $initSuffix }}
        {{- end }}
      {{- end }}
      {{- with $c.secrets }}
        env:
        {{- range $secretName := . }}
          {{- $secret := index $teamSecrets $secretName }}
          {{- range $entry := $secret.entries }}
          - name: {{ $entry }}
            valueFrom:
              secretKeyRef:
                name: {{ $secretName }}
                key: {{ $entry }}
          {{- end }}
        {{- end }}
      {{- end }}
        securityContext:
      {{- with $c.securityContext }}
          {{- toYaml . | nindent 10 }}
      {{- else }}
          runAsNonRoot: true
      {{- end }}
    {{- end }}
    {{- if or $c.files $c.secretMounts }}
        volumeMounts:
      {{- range $location, $content := $c.files }}
          - name: {{ $.Release.Name }}-{{ include "flatten-name" $location }}{{ $initSuffix }}
            mountPath: {{ $location }}
            readOnly: true
      {{- end }}
      {{- range $location, $secret := $c.secretMounts }}
          - name: {{ $.Release.Name }}-{{ include "flatten-name" $location }}{{ $initSuffix }}
            mountPath: {{ $location }}
            readOnly: true
      {{- end }}
    {{- end }}
  {{- end }}
    restartPolicy: Never
  {{- if $hasMounts }}
    volumes:
    {{- range $item := $containers }}    
      {{- $c := $item.container }}
      {{- $initSuffix := $item.isInit | ternary "-init" "" }}
      {{- range $location, $content := $c.files }}
      - name: {{ $.Release.Name }}-{{ include "flatten-name" $location }}{{ $initSuffix }}
        configMap:
          name: {{ $.Release.Name }}-{{ include "flatten-name" $location }}{{ $initSuffix }}
      {{- end }}
      {{- range $location, $secret := $c.secretMounts }}
      - name: {{ $.Release.Name }}-{{ include "flatten-name" $location }}{{ $initSuffix }}
        secret:
          secretName: {{ $secret }}
      {{- end }}
    {{- end }}
  {{- end }}
backoffLimit: 3
ttlSecondsAfterFinished: {{ $v.ttlSecondsAfterFinished | default 86400 }}
{{- end -}}