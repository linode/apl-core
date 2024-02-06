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
{{- $res := regexReplaceAll "[()/_-]{1}" . "" -}}
{{- regexReplaceAll "[|.]{1}" $res "-" | trimAll "-" | lower -}}
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
{{- end -}}
{{- $vols := include "file-volumes" $v | fromYaml }}
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
    {{- with .Values.podDnsPolicy }}
    dnsPolicy: {{ . }}
    {{- end }}
    {{- with .Values.podDnsConfig }}
    dnsConfig: {{- toYaml . | nindent 8 }}
    {{- end }}
    serviceAccountName: {{ $v.serviceAccountName | default "default" }}
    securityContext:
      {{- with $podSecurityContext }}
      {{- toYaml . | nindent 6 }}
      {{- else }}
      runAsNonRoot: true
      {{- end }}
  {{- $didNotPlaceInitContainer := true }}
  {{- range $item := $containers }}
    {{- $c := $item.container }}
    {{- $initSuffix := $item.isInit | ternary "-i" "" }}
    {{- if and (and $item.isInit $didNotPlaceInitContainer) $c }}
    initContainers:
      {{- $didNotPlaceInitContainer = false }}
    {{- end }}
    {{- if not $item.isInit }}
    containers:
    {{- end }}
    {{- if $c }}
      - image: {{ $c.image.repository | default $v.image.repository }}:{{ $c.image.tag | default (hasKey $c.image "repository" | ternary "latest" ($v.image.tag | default "latest")) }}
        imagePullPolicy: {{ $c.image.pullPolicy | default $v.image.pullPolicy | default "IfNotPresent"}}
        name: {{ print $.Release.Name $initSuffix | trunc 63 | trimSuffix "-" }}
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
            name: {{ print $.Release.Name "-env" $initSuffix | trunc 63 | trimSuffix "-" }}
        {{- end }}
        {{- if $c.nativeSecrets }}
        - secretRef:
            name: {{ print $.Release.Name $initSuffix | trunc 63 | trimSuffix "-" }}
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
      {{- range $dir, $files := $vols }}
          - name: {{ print $.Release.Name (include "flatten-name" $dir) | trunc 63 }}
            mountPath: {{ $dir }}
            readOnly: true
      {{- end }}
      {{- range $location, $secret := $c.secretMounts }}
          - name: {{ print $.Release.Name (include "flatten-name" $location) $initSuffix | trunc 63 }}
            mountPath: {{ $location | dir }}
            subPath: {{ $location | base }}
            readOnly: true
      {{- end }}
    {{- end }}
  {{- end }}
    restartPolicy: Never
  {{- if $hasMounts }}
    volumes:
    {{- range $dir, $files := $vols }}
      - name: {{ print $.Release.Name (include "flatten-name" $dir) | trunc 63 }}
        configMap:
          name: {{ print $.Release.Name (include "flatten-name" $dir) | trunc 63 }}
          items:
            {{- range $fileContent := $files }}
            - key: {{ $fileContent.name }}
              path: {{ $fileContent.name }}
            {{- end }}
    {{- end }}
    {{- range $item := $containers }}
      {{- $c := $item.container }}
      {{- $initSuffix := $item.isInit | ternary "-i" "" }}
      {{- range $location, $secret := $c.secretMounts }}
      - name: {{ print $.Release.Name (include "flatten-name" $location) $initSuffix | trunc 63 }}
        secret:
          secretName: {{ $secret }}
      {{- end }}
    {{- end }}
  {{- end }}
backoffLimit: 3
ttlSecondsAfterFinished: {{ $v.ttlSecondsAfterFinished | default 86400 }}
{{- end -}}

{{/* aggregate all the files and create a dict by dirname > list (filename content) */}}
{{- define "file-volumes" }}
{{- $vols := dict }}
{{- range $location, $content := .files }}
  {{- $dir := $location | dir }}
  {{- $file := $location | base }}
  {{- $fileContent := (dict "name" $file "content" $content) }}
  {{- $files := list }}
  {{- if hasKey $vols $dir }}
    {{- $files = (index $vols $dir) }}
  {{- end }}
  {{- $files = append $files $fileContent }}
  {{- $vols = set $vols $dir $files }}
{{- end }}  
{{- range $dir, $files := $vols }}
{{ $dir }}: {{- $files | toYaml | nindent 2 }}
{{- end }}
{{- end }}