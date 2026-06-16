{{/*
Pod helper
*/}}

{{- define "loki.podTemplate" -}}
{{- $target := .target -}}
{{- $ctx := .ctx -}}
{{- $component := .component -}}
{{- $args := .args -}}
{{- $rolloutZoneName := .rolloutZoneName | default "" -}}
{{- $memberlist := hasKey . "memberlist" | ternary .memberlist true -}}
{{- with $ctx -}}
metadata:
  annotations:
    {{- if ne $target "canary" }}
    {{- include "loki.config.checksum" . | nindent 4 }}
    {{- end }}
    {{- with (mergeOverwrite (dict) .Values.loki.podAnnotations .Values.defaults.podAnnotations ($component.podAnnotations | default (dict))) }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
    kubectl.kubernetes.io/default-container: "{{ replace "single-binary" "loki" $target }}"
  labels:
    {{- include "loki.labels" . | nindent 4 }}
    app.kubernetes.io/component: {{ $target }}
    {{- if $memberlist }}
    app.kubernetes.io/part-of: memberlist
    {{- end }}
    {{- if $rolloutZoneName }}
    name: {{ if $component.addIngesterNamePrefix }}loki-{{ end }}{{ $target }}-{{ $rolloutZoneName }}
    rollout-group: {{ with $component.rolloutGroupPrefix }}{{ . }}-{{ end }}{{ $target }}
    {{- end }}
    {{- with (mergeOverwrite (dict) .Values.loki.podLabels .Values.defaults.podLabels $component.podLabels) }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
spec:
  {{- with $component.topologySpreadConstraints }}
  topologySpreadConstraints:
    {{- tpl ( . | toYaml) $ctx | nindent 4 }}
  {{- end }}
  serviceAccountName: {{ include "loki.serviceAccountName" (dict "ctx" . "component" (eq $target "single-binary" | ternary .Values $component) "target" (replace "single-binary" "" $target) ) }}
  {{- $esl := include "loki.enableServiceLinks" (dict "component" $component "ctx" .) }}
  {{- if $esl }}
  {{ $esl }}
  {{- end }}
  {{- if (kindIs "bool" $component.automountServiceAccountToken) }}
  automountServiceAccountToken: {{ $component.automountServiceAccountToken }}
  {{- else if (kindIs "bool" .Values.defaults.automountServiceAccountToken) }}
  automountServiceAccountToken: {{ .Values.defaults.automountServiceAccountToken }}
  {{- end }}
  {{- with .Values.imagePullSecrets }}
  imagePullSecrets:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with (coalesce $component.dnsConfig .Values.defaults.dnsConfig .Values.loki.dnsConfig) }}
  dnsConfig:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with (coalesce $component.hostAliases .Values.defaults.hostAliases .Values.loki.hostAliases) }}
  hostAliases:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- if (kindIs "bool" $component.hostUsers) }}
  hostUsers: {{ $component.hostUsers }}
  {{- else if (kindIs "bool" .Values.defaults.hostUsers) }}
  hostUsers: {{ .Values.defaults.hostUsers }}
  {{- else if (kindIs "bool" .Values.loki.hostUsers) }}
  hostUsers: {{ .Values.loki.hostUsers }}
  {{- end }}
  {{- with (coalesce $component.priorityClassName .Values.defaults.priorityClassName .Values.loki.priorityClassName .Values.global.priorityClassName) }}
  priorityClassName: {{ . }}
  {{- end }}
  {{- with (coalesce $component.podSecurityContext .Values.defaults.podSecurityContext .Values.loki.podSecurityContext) }}
  securityContext:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with (coalesce $component.terminationGracePeriodSeconds .Values.defaults.terminationGracePeriodSeconds .Values.loki.terminationGracePeriodSeconds) }}
  terminationGracePeriodSeconds: {{ . }}
  {{- end }}
  {{- with $component.initContainers }}
  initContainers:
    {{- if kindIs "slice" . }}
      {{- tpl (toYaml .) $ctx | nindent 4 }}
    {{- else if kindIs "string" . }}
      {{- tpl . $ctx | nindent 4 }}
    {{- end }}
  {{- end }}
  {{- if $rolloutZoneName }}
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
              - key: rollout-group
                operator: In
                values:
                  - {{ with $component.rolloutGroupPrefix }}{{ . }}-{{ end }}{{ $target }}
              - key: name
                operator: NotIn
                values:
                  - {{ if $component.addIngesterNamePrefix -}}loki-{{ end }}{{ $target }}-{{ $rolloutZoneName }}
          topologyKey: kubernetes.io/hostname
    {{- with (dig "zoneAwareReplication" (printf "zone%s" (upper (splitList "-" $rolloutZoneName | last))) "extraAffinity" nil $component) }}
      {{- tpl ( . | toYaml) $ctx | nindent 4 }}
    {{- end }}
  {{- else }}
    {{- with $component.affinity }}
  affinity:
    {{- tpl ( . | toYaml) $ctx | nindent 4 }}
    {{- end }}
  {{- end }}
  {{- if $rolloutZoneName }}
  {{- with (dig "zoneAwareReplication" (printf "zone%s" (upper (splitList "-" $rolloutZoneName | last))) "nodeSelector" nil $component) }}
  nodeSelector:
    {{- tpl ( . | toYaml) $ctx | nindent 4 }}
  {{- end }}
  {{- else }}
  {{- with (coalesce $component.nodeSelector .Values.defaults.nodeSelector .Values.loki.nodeSelector) }}
  nodeSelector:
    {{- tpl ( . | toYaml) $ctx | nindent 4 }}
  {{- end }}
  {{- end }}
  {{- with (coalesce $component.tolerations .Values.defaults.tolerations .Values.loki.tolerations) }}
  tolerations:
    {{- tpl ( . | toYaml) $ctx | nindent 4 }}
  {{- end }}
  volumes:
    - name: temp
      emptyDir: {}
    {{- if ne $target "canary" }}
    - name: config
      {{- include "loki.configVolume" . | nindent 6 }}
    - name: runtime-config
      configMap:
        name: {{ template "loki.name" . }}-runtime
    {{- if not (or (dig "persistence" "volumeClaimsEnabled" false $component) (dig "persistence" "enabled" false $component)) }}
    - name: {{ eq $target "single-binary" | ternary "storage" "data" }}
      {{- if dig "persistence" "inMemory" false $component }}
      emptyDir:
        medium: Memory
        {{- with $component.persistence.size }}
        sizeLimit: {{ . }}
        {{- end }}
      {{- else }}
      {{- tpl (toYaml (dig "persistence" "dataVolumeParameters" (dict) $component | default (dict "emptyDir" (dict)))) $ctx | nindent 6 }}
      {{- end }}
    {{- else if and (or (dig "persistence" "volumeClaimsEnabled" false $component) (dig "persistence" "enabled" false $component)) (eq (dig "persistence" "type" "" $component) "pvc") (eq $component.kind "Deployment") }}
    - name: {{ eq $target "single-binary" | ternary "storage" "data" }}
      persistentVolumeClaim:
        claimName: {{ template "loki.fullname" . }}-data
    {{- else if and (or (dig "persistence" "volumeClaimsEnabled" false $component) (dig "persistence" "enabled" false $component)) (eq (dig "persistence" "type" "" $component) "ephemeral") }}
    - name: {{ eq $target "single-binary" | ternary "storage" "data" }}
      ephemeral:
        volumeClaimTemplate:
          metadata:
            {{- with $component.persistence.annotations }}
            annotations:
              {{- toYaml . | nindent 14 }}
            {{- end }}
            {{- with $component.persistence.labels }}
            labels:
              {{- toYaml . | nindent 14 }}
            {{- end }}
          spec:
            accessModes:
              {{- toYaml $component.persistence.accessModes | nindent 12 }}
            {{- if not (kindIs "invalid" $component.persistence.storageClass) }}
            storageClassName: {{ if (eq "-" $component.persistence.storageClass) }}""{{ else }}{{ $component.persistence.storageClass }}{{ end }}
            {{- end }}
            {{- with $component.persistence.volumeAttributesClassName }}
            volumeAttributesClassName: {{ . }}
            {{- end }}
            resources:
              requests:
                storage: {{ $component.persistence.size | quote }}
            {{- with $component.persistence.selector }}
            selector:
              {{- toYaml . | nindent 14 }}
            {{- end }}
      {{- end }}
    {{- end }}
    {{- if and $component.sidecar .Values.sidecar.rules.enabled }}
    - name: sc-rules-volume
      {{- if .Values.sidecar.rules.sizeLimit }}
      emptyDir:
        sizeLimit: {{ .Values.sidecar.rules.sizeLimit }}
      {{- else }}
      emptyDir: {}
      {{- end }}
    - name: sc-rules-temp
      emptyDir: {}
    {{- end }}
    {{- if has $target (list "ruler" "backend" "single-binary") }}
    {{- range $dir, $_ := .Values.ruler.directories }}
    - name: {{ include "loki.rulerRulesDirName" $dir }}
      configMap:
        name: {{ include "loki.resourceName" (dict "ctx" $ctx "component" $target "suffix" (include "loki.rulerRulesDirName" $dir)) }}
    {{- end }}
    {{- end }}
    {{- with (concat .Values.global.extraVolumes .Values.defaults.extraVolumes $component.extraVolumes) | uniq }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
  containers:
    - name: {{ replace "single-binary" "loki" $target }}
      image: {{ include "loki.image" (dict "ctx" . "component" $component.image "default" .Values.loki.image "defaultVersion" .Chart.AppVersion) }}
      imagePullPolicy: {{ coalesce $component.image.pullPolicy .Values.loki.image.pullPolicy }}
      {{- with coalesce $component.command .Values.defaults.command .Values.loki.command }}
      command:
        - {{ . | quote }}
      {{- end }}
      args:
        {{- if ne $target "canary" }}
        - -config.file=/etc/loki/config/config.yaml
        - -config.expand-env=true
        - -memberlist.advertise-addr=$(POD_IP)
        - -target={{ replace "single-binary" "all" $target }}{{- if and .Values.loki.ui.enabled (has $target (list "single-binary" "read" "query-frontend" "querier")) }},ui{{- end }}
        {{- end }}
        {{- with $args }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
        {{- with (concat .Values.global.extraArgs .Values.defaults.extraArgs $component.extraArgs) | uniq }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
      ports:
        {{- if eq $target "canary" }}
        - name: http-metrics
          containerPort: 3500
          protocol: TCP
        {{- else }}
        - name: http-metrics
          containerPort: {{ .Values.loki.server.http_listen_port }}
          protocol: TCP
        - name: grpc
          containerPort: {{ .Values.loki.server.grpc_listen_port }}
          protocol: TCP
        - name: http-memberlist
          containerPort: 7946
          protocol: TCP
        {{- end }}
      {{- include "loki.componentEnv" (dict "extraEnv" (concat .Values.global.extraEnv .Values.defaults.extraEnv $component.extraEnv) "resources" $component.resources "factor" .Values.defaults.goSettings.goMemLimitFactor "gogc" .Values.defaults.goSettings.gogc) | nindent 6 }}
      {{- with (concat .Values.global.extraEnvFrom .Values.defaults.extraEnvFrom $component.extraEnvFrom) | uniq }}
      envFrom:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with (coalesce $component.containerSecurityContext .Values.defaults.containerSecurityContext .Values.loki.containerSecurityContext) }}
      securityContext:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with (coalesce $component.livenessProbe .Values.defaults.livenessProbe .Values.loki.livenessProbe) }}
        {{- if .enabled | default true }}
      livenessProbe:
        {{- toYaml (omit . "enabled") | nindent 8 }}
        {{- end }}
      {{- end }}
      {{- with (coalesce $component.readinessProbe .Values.defaults.readinessProbe .Values.loki.readinessProbe) }}
        {{- if .enabled | default true }}
      readinessProbe:
        {{- toYaml (omit . "enabled") | nindent 8 }}
        {{- end }}
      {{- end }}
      {{- with (coalesce $component.startupProbe .Values.defaults.startupProbe .Values.loki.startupProbe) }}
        {{- if .enabled | default true }}
      startupProbe:
        {{- toYaml (omit . "enabled") | nindent 8 }}
        {{- end }}
      {{- end }}
      {{- with $component.lifecycle }}
      lifecycle:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      volumeMounts:
        {{- if ne $target "canary" }}
        - name: config
          mountPath: /etc/loki/config
        - name: runtime-config
          mountPath: /etc/loki/runtime-config
        - name: {{ eq $target "single-binary" | ternary "storage" "data" }}
          mountPath: /var/loki
        {{- end }}
        - name: temp
          mountPath: /tmp
        {{- if and $component.sidecar .Values.sidecar.rules.enabled }}
        - name: sc-rules-volume
          mountPath: {{ .Values.sidecar.rules.folder | quote }}
        {{- end }}
        {{- if has $target (list "ruler" "backend" "single-binary") }}
          {{- range $dir, $_ := .Values.ruler.directories }}
        - name: {{ include "loki.rulerRulesDirName" $dir }}
          mountPath: /etc/loki/rules/{{ $dir }}
          {{- end }}
        {{- end }}
        {{- with (concat .Values.global.extraVolumeMounts .Values.defaults.extraVolumeMounts $component.extraVolumeMounts) | uniq }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
      {{- with (coalesce $component.resources .Values.defaults.resources .Values.loki.resources) }}
      resources:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- if and $component.sidecar .Values.sidecar.rules.enabled }}
    {{- include "loki.rulesSidecar" . | nindent 4 }}
      {{- end }}
    {{- with $component.extraContainers }}
      {{- if kindIs "slice" . }}
        {{- tpl (toYaml .) $ctx | nindent 4 }}
      {{- else if kindIs "string" . }}
        {{- tpl . $ctx | nindent 4 }}
      {{- end }}
    {{- end }}
  {{- end }}
{{- end }}


{{/*
rules sidecar
*/}}
{{- define "loki.rulesSidecar" -}}
{{- if .Values.sidecar.rules.enabled -}}
- name: loki-sc-rules
  image: {{ include "loki.image" (dict "ctx" . "component" .Values.sidecar.image) }}
  imagePullPolicy: {{ .Values.sidecar.image.pullPolicy }}
  {{- if .Values.sidecar.rules.healthPort }}
  ports:
    - name: http-sidecar
      containerPort: {{ .Values.sidecar.rules.healthPort }}
      protocol: TCP
  {{- end }}
  {{- with .Values.sidecar.resources }}
  resources:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with .Values.sidecar.securityContext }}
  securityContext:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with .Values.sidecar.livenessProbe }}
    {{- if .enabled }}
  livenessProbe:
    {{- toYaml (omit . "enabled") | nindent 8 }}
    {{- end }}
  {{- end }}
  {{- with .Values.sidecar.readinessProbe }}
    {{- if .enabled }}
  readinessProbe:
    {{- toYaml (omit . "enabled") | nindent 8 }}
    {{- end }}
  {{- end }}
  {{- with .Values.sidecar.startupProbe }}
    {{- if .enabled }}
  startupProbe:
    {{- toYaml (omit . "enabled") | nindent 8 }}
    {{- end }}
  {{- end }}
  env:
    - name: METHOD
      value: {{ .Values.sidecar.rules.watchMethod }}
    - name: LABEL
      value: "{{ .Values.sidecar.rules.label }}"
    {{- if .Values.sidecar.rules.labelValue }}
    - name: LABEL_VALUE
      value: {{ quote .Values.sidecar.rules.labelValue }}
    {{- end }}
    - name: FOLDER
      value: "{{ .Values.sidecar.rules.folder }}"
    {{- if .Values.sidecar.rules.folderAnnotation }}
    - name: FOLDER_ANNOTATION
      value: "{{ .Values.sidecar.rules.folderAnnotation }}"
    {{- end }}
    - name: RESOURCE
      value: {{ quote .Values.sidecar.rules.resource }}
    {{- if .Values.sidecar.enableUniqueFilenames }}
    - name: UNIQUE_FILENAMES
      value: "{{ .Values.sidecar.enableUniqueFilenames }}"
    {{- end }}
    {{- if .Values.sidecar.rules.searchNamespace }}
    - name: NAMESPACE
      value: "{{ .Values.sidecar.rules.searchNamespace | join "," }}"
    {{- end }}
    {{- if .Values.sidecar.skipTlsVerify }}
    - name: SKIP_TLS_VERIFY
      value: "{{ .Values.sidecar.skipTlsVerify }}"
    {{- end }}
    {{- if .Values.sidecar.disableX509StrictVerification }}
    - name: DISABLE_X509_STRICT_VERIFICATION
      value: "{{ .Values.sidecar.disableX509StrictVerification }}"
    {{- end }}
    {{- if .Values.sidecar.rules.script }}
    - name: SCRIPT
      value: "{{ .Values.sidecar.rules.script }}"
    {{- end }}
    {{- if .Values.sidecar.rules.watchServerTimeout }}
    - name: WATCH_SERVER_TIMEOUT
      value: "{{ .Values.sidecar.rules.watchServerTimeout }}"
    {{- end }}
    {{- if .Values.sidecar.rules.watchClientTimeout }}
    - name: WATCH_CLIENT_TIMEOUT
      value: "{{ .Values.sidecar.rules.watchClientTimeout }}"
    {{- end }}
    {{- if .Values.sidecar.rules.logLevel }}
    - name: LOG_LEVEL
      value: "{{ .Values.sidecar.rules.logLevel }}"
    {{- end }}
    {{- if .Values.sidecar.rules.healthPort }}
    - name: HEALTH_PORT
      value: "{{ .Values.sidecar.rules.healthPort }}"
    {{- end }}
  volumeMounts:
    - name: sc-rules-temp
      mountPath: /tmp
    - name: sc-rules-volume
      mountPath: {{ .Values.sidecar.rules.folder | quote }}
{{- end }}
{{- end }}
