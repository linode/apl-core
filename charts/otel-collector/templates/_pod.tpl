{{- define "opentelemetry-collector.pod" -}}
{{- with .Values.imagePullSecrets }}
imagePullSecrets:
  {{- toYaml . | nindent 2 }}
{{- end }}
serviceAccountName: {{ include "opentelemetry-collector.serviceAccountName" . }}
securityContext:
  {{- toYaml .Values.podSecurityContext | nindent 2 }}
containers:
  - name: {{ include "opentelemetry-collector.lowercase_chartname" . }}
    command:
      - /{{ .Values.command.name }}
      {{- if .Values.configMap.create }}
      - --config=/conf/relay.yaml
      {{- end }}
      {{- range .Values.command.extraArgs }}
      - {{ . }}
      {{- end }}
    securityContext:
      {{- if and (not (.Values.securityContext)) (.Values.presets.logsCollection.storeCheckpoints) }}
      runAsUser: 0
      runAsGroup: 0
      {{- else -}}
      {{- toYaml .Values.securityContext | nindent 6 }}
      {{- end }}
    {{- if .Values.image.digest }}
    image: "{{ .Values.image.repository }}@{{ .Values.image.digest }}"
    {{- else }}
    image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
    {{- end }}
    imagePullPolicy: {{ .Values.image.pullPolicy }}
    ports:
      {{- range $key, $port := .Values.ports }}
      {{- if $port.enabled }}
      - name: {{ $key }}
        containerPort: {{ $port.containerPort }}
        protocol: {{ $port.protocol }}
        {{- if and $.isAgent $port.hostPort }}
        hostPort: {{ $port.hostPort }}
        {{- end }}
      {{- end }}
      {{- end }}
    env:
      - name: MY_POD_IP
        valueFrom:
          fieldRef:
            apiVersion: v1
            fieldPath: status.podIP
      {{- if or .Values.presets.kubeletMetrics.enabled (and .Values.presets.kubernetesAttributes.enabled (eq .Values.mode "daemonset")) }}
      - name: K8S_NODE_NAME
        valueFrom:
          fieldRef:
            fieldPath: spec.nodeName
      {{- end }}
      {{- with .Values.extraEnvs }}
      {{- . | toYaml | nindent 6 }}
      {{- end }}
    {{- with .Values.extraEnvsFrom }}
    envFrom:
    {{- . | toYaml | nindent 6 }}
    {{- end }}
    {{- if .Values.lifecycleHooks }}
    lifecycle:
      {{- toYaml .Values.lifecycleHooks | nindent 6 }}
    {{- end }}
    livenessProbe:
      {{- if .Values.livenessProbe.initialDelaySeconds | empty | not }}
      initialDelaySeconds: {{ .Values.livenessProbe.initialDelaySeconds }}
      {{- end }}
      {{- if .Values.livenessProbe.periodSeconds | empty | not }}
      periodSeconds: {{ .Values.livenessProbe.periodSeconds }}
      {{- end }}
      {{- if .Values.livenessProbe.timeoutSeconds | empty | not }}
      timeoutSeconds: {{ .Values.livenessProbe.timeoutSeconds }}
      {{- end }}
      {{- if .Values.livenessProbe.failureThreshold | empty | not }}
      failureThreshold: {{ .Values.livenessProbe.failureThreshold }}
      {{- end }}
      {{- if .Values.livenessProbe.terminationGracePeriodSeconds | empty | not }}
      terminationGracePeriodSeconds: {{ .Values.livenessProbe.terminationGracePeriodSeconds }}
      {{- end }}
      httpGet:
        path: {{ .Values.livenessProbe.httpGet.path }}
        port: {{ .Values.livenessProbe.httpGet.port }}
    readinessProbe:
      {{- if .Values.readinessProbe.initialDelaySeconds | empty | not }}
      initialDelaySeconds: {{ .Values.readinessProbe.initialDelaySeconds }}
      {{- end }}
      {{- if .Values.readinessProbe.periodSeconds | empty | not }}
      periodSeconds: {{ .Values.readinessProbe.periodSeconds }}
      {{- end }}
      {{- if .Values.readinessProbe.timeoutSeconds | empty | not }}
      timeoutSeconds: {{ .Values.readinessProbe.timeoutSeconds }}
      {{- end }}
      {{- if .Values.readinessProbe.successThreshold | empty | not }}
      successThreshold: {{ .Values.readinessProbe.successThreshold }}
      {{- end }}
      {{- if .Values.readinessProbe.failureThreshold | empty | not }}
      failureThreshold: {{ .Values.readinessProbe.failureThreshold }}
      {{- end }}
      httpGet:
        path: {{ .Values.readinessProbe.httpGet.path }}
        port: {{ .Values.readinessProbe.httpGet.port }}
    {{- with .Values.resources }}
    resources:
      {{- toYaml . | nindent 6 }}
    {{- end }}
    volumeMounts:
      {{- if .Values.configMap.create }}
      - mountPath: /conf
        name: {{ include "opentelemetry-collector.lowercase_chartname" . }}-configmap
      {{- end }}
      {{- range .Values.extraConfigMapMounts }}
      - name: {{ .name }}
        mountPath: {{ .mountPath }}
        readOnly: {{ .readOnly }}
        {{- if .subPath }}
        subPath: {{ .subPath }}
        {{- end }}
      {{- end }}
      {{- range .Values.extraHostPathMounts }}
      - name: {{ .name }}
        mountPath: {{ .mountPath }}
        readOnly: {{ .readOnly }}
        {{- if .mountPropagation }}
        mountPropagation: {{ .mountPropagation }}
        {{- end }}
      {{- end }}
      {{- range .Values.secretMounts }}
      - name: {{ .name }}
        mountPath: {{ .mountPath }}
        readOnly: {{ .readOnly }}
        {{- if .subPath }}
        subPath: {{ .subPath }}
        {{- end }}
      {{- end }}
      {{- if eq (include "opentelemetry-collector.logsCollectionEnabled" .) "true" }}
      - name: varlogpods
        mountPath: /var/log/pods
        readOnly: true
      - name: varlibdockercontainers
        mountPath: /var/lib/docker/containers
        readOnly: true
      {{- if .Values.presets.logsCollection.storeCheckpoints}}
      - name: varlibotelcol
        mountPath: /var/lib/otelcol
      {{- end }}
      {{- end }}
      {{- if .Values.presets.hostMetrics.enabled }}
      - name: hostfs
        mountPath: /hostfs
        readOnly: true
        mountPropagation: HostToContainer
      {{- end }}
      {{- if .Values.extraVolumeMounts }}
      {{- toYaml .Values.extraVolumeMounts | nindent 6 }}
      {{- end }}
{{- with .Values.extraContainers }}
{{- toYaml . | nindent 2 }}
{{- end }}
{{- if .Values.initContainers }}
initContainers:
  {{- tpl (toYaml .Values.initContainers) . | nindent 2 }}
{{- end }}
{{- if .Values.priorityClassName }}
priorityClassName: {{ .Values.priorityClassName | quote }}
{{- end }}
volumes:
  {{- if .Values.configMap.create }}
  - name: {{ include "opentelemetry-collector.lowercase_chartname" . }}-configmap
    configMap:
      name: {{ include "opentelemetry-collector.fullname" . }}{{ .configmapSuffix }}
      items:
        - key: relay
          path: relay.yaml
  {{- end }}
  {{- range .Values.extraConfigMapMounts }}
  - name: {{ .name }}
    configMap:
      name: {{ .configMap }}
  {{- end }}
  {{- range .Values.extraHostPathMounts }}
  - name: {{ .name }}
    hostPath:
      path: {{ .hostPath }}
  {{- end }}
  {{- range .Values.secretMounts }}
  - name: {{ .name }}
    secret:
      secretName: {{ .secretName }}
  {{- end }}
  {{- if eq (include "opentelemetry-collector.logsCollectionEnabled" .) "true" }}
  - name: varlogpods
    hostPath:
      path: /var/log/pods
  {{- if .Values.presets.logsCollection.storeCheckpoints}}
  - name: varlibotelcol
    hostPath:
      path: /var/lib/otelcol
      type: DirectoryOrCreate
  {{- end }}
  - name: varlibdockercontainers
    hostPath:
      path: /var/lib/docker/containers
  {{- end }}
  {{- if .Values.presets.hostMetrics.enabled }}
  - name: hostfs
    hostPath:
      path: /
  {{- end }}
  {{- if .Values.extraVolumes }}
  {{- toYaml .Values.extraVolumes | nindent 2 }}
  {{- end }}
{{- with .Values.nodeSelector }}
nodeSelector:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.affinity }}
affinity:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.tolerations }}
tolerations:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.topologySpreadConstraints }}
topologySpreadConstraints:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}
