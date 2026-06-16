{{/*
Service helper
*/}}

{{- define "loki.service" }}
{{- $target := .target }}
{{- $ctx := .ctx }}
{{- $component := .component }}
{{- $rolloutZoneName := .rolloutZoneName }}
{{- $headlessName := .headlessName }}
{{- $name := .name }}
{{- $serviceEnabled := kindIs "bool" .serviceEnabled | ternary .serviceEnabled true }}
{{- $headlessServiceEnabled := kindIs "bool" .headlessServiceEnabled | ternary .headlessServiceEnabled true }}
{{- $publishNotReadyAddresses := kindIs "bool" .publishNotReadyAddresses | ternary .publishNotReadyAddresses true }}
{{- with $ctx }}
{{- if $serviceEnabled }}
apiVersion: v1
kind: Service
metadata:
  {{- if $name }}
  name: "{{ $name }}"
  {{- else }}
  name: "{{ include "loki.resourceName" (dict "ctx" . "component" $target "rolloutZoneName" $rolloutZoneName) }}"
  {{- end }}
  namespace: "{{ include "loki.namespace" . }}"
  labels:
    {{- include "loki.labels" . | nindent 4 }}
    app.kubernetes.io/component: {{ $target | quote }}
    {{- with (mergeOverwrite (dict) .Values.defaults.service.labels ($component.serviceLabels | default dict) $component.service.labels) }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
  annotations:
    {{- with (mergeOverwrite (dict) .Values.loki.serviceAnnotations .Values.defaults.service.annotations ($component.serviceAnnotations | default dict) $component.service.annotations) }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
spec:
  type: {{ $component.serviceType | default $component.service.type | default "ClusterIP" }}
  {{- with $publishNotReadyAddresses }}
  publishNotReadyAddresses: {{ . }}
  {{- end }}
  ports:
    - name: http-metrics
      port: {{ .Values.loki.server.http_listen_port }}
      targetPort: http-metrics
      protocol: TCP
    - name: grpc
      port: {{ .Values.loki.server.grpc_listen_port }}
      targetPort: grpc
      protocol: TCP
      {{- with (dig "appProtocol" "grpc" $component.service.appProtocol.grpc $component) }}
      appProtocol: {{ . }}
      {{- end }}
    - name: grpclb
      port: 9096
      targetPort: grpc
      protocol: TCP
      {{- with (dig "appProtocol" "grpc" $component.service.appProtocol.grpc $component) }}
      appProtocol: {{ . }}
      {{- end }}
  selector:
    {{ include "loki.selectorLabels" . | nindent 4 }}
    app.kubernetes.io/component: {{ $target | quote }}
{{- with (coalesce $component.trafficDistribution $component.service.trafficDistribution .Values.defaults.service.trafficDistribution .Values.loki.service.trafficDistribution) }}
  trafficDistribution: {{ . }}
{{- end }}
{{- with $component.service.sessionAffinity }}
  sessionAffinity: {{ . }}
{{- end }}
{{- with $component.service.sessionAffinityConfig }}
  sessionAffinityConfig:
    {{- toYaml . | nindent 4 }}
{{- end }}
{{- with (coalesce $component.service.ipFamilyPolicy .Values.defaults.service.ipFamilyPolicy) }}
  ipFamilyPolicy: {{ . }}
{{- end }}
{{- with (coalesce $component.service.ipFamilies .Values.defaults.service.ipFamilies) }}
  ipFamilies:
    {{- toYaml . | nindent 4 }}
{{- end }}
{{- end }}
{{- if $headlessServiceEnabled }}
---
apiVersion: v1
kind: Service
metadata:
  {{- if $headlessName }}
  name: "{{ $headlessName }}"
  {{- else }}
  name: "{{ include "loki.resourceName" (dict "ctx" . "component" $target "suffix" "headless" "rolloutZoneName" $rolloutZoneName) }}"
  {{- end }}
  namespace: {{ include "loki.namespace" . }}
  labels:
    {{- include "loki.labels" . | nindent 4 }}
    app.kubernetes.io/component: {{ $target | quote }}
    prometheus.io/service-monitor: "false"
    variant: headless
    {{- with (mergeOverwrite (dict) .Values.defaults.service.labels ($component.serviceLabels | default dict) $component.service.labels) }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
  annotations:
    {{- with (mergeOverwrite (dict) .Values.loki.serviceAnnotations .Values.defaults.service.annotations ($component.serviceAnnotations | default dict) $component.service.annotations) }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
spec:
  clusterIP: None
  type: ClusterIP
  {{- with $publishNotReadyAddresses }}
  publishNotReadyAddresses: {{ . }}
  {{- end }}
  ports:
    - name: http-metrics
      port: {{ .Values.loki.server.http_listen_port }}
      targetPort: http-metrics
      protocol: TCP
    - name: grpc
      port: {{ .Values.loki.server.grpc_listen_port }}
      targetPort: grpc
      protocol: TCP
      {{- with (dig "appProtocol" "grpc" $component.service.appProtocol.grpc $component) }}
      appProtocol: {{ . }}
      {{- end }}
    - name: grpclb
      port: 9096
      targetPort: grpc
      protocol: TCP
      {{- with (dig "appProtocol" "grpc" $component.service.appProtocol.grpc $component) }}
      appProtocol: {{ . }}
      {{- end }}
  selector:
    {{ include "loki.selectorLabels" . | nindent 4 }}
    app.kubernetes.io/component: {{ $target | quote }}
    {{- if $rolloutZoneName }}
    name: {{ if $component.addIngesterNamePrefix }}loki-{{ end }}{{ $target }}-{{ $rolloutZoneName }}
    rollout-group: {{ with $component.rolloutGroupPrefix }}{{ . }}-{{ end }}{{ $target }}
    {{- end }}
{{- end }}
{{- end }}
{{- end }}
