{{- /*
The pod definition included in the controller.
*/ -}}
{{- define "bjw-s.common.lib.controller.pod" -}}
  {{- with .Values.imagePullSecrets }}
imagePullSecrets:
    {{- toYaml . | nindent 2 }}
  {{- end }}
serviceAccountName: {{ include "bjw-s.common.lib.chart.names.serviceAccountName" . }}
automountServiceAccountToken: {{ .Values.automountServiceAccountToken }}
  {{- with .Values.podSecurityContext }}
securityContext:
    {{- toYaml . | nindent 2 }}
  {{- end }}
  {{- with .Values.priorityClassName }}
priorityClassName: {{ . }}
  {{- end }}
  {{- with .Values.runtimeClassName }}
runtimeClassName: {{ . }}
  {{- end }}
  {{- with .Values.schedulerName }}
schedulerName: {{ . }}
  {{- end }}
  {{- with .Values.hostIPC }}
hostIPC: {{ . }}
  {{- end }}
  {{- with .Values.hostNetwork }}
hostNetwork: {{ . }}
  {{- end }}
  {{- with .Values.hostPID }}
hostPID: {{ . }}
  {{- end }}
  {{- with .Values.hostname }}
hostname: {{ . }}
  {{- end }}
  {{- if .Values.dnsPolicy }}
dnsPolicy: {{ .Values.dnsPolicy }}
  {{- else if .Values.hostNetwork }}
dnsPolicy: ClusterFirstWithHostNet
  {{- else }}
dnsPolicy: ClusterFirst
  {{- end }}
  {{- with .Values.dnsConfig }}
dnsConfig:
    {{- toYaml . | nindent 2 }}
  {{- end }}
enableServiceLinks: {{ .Values.enableServiceLinks }}
  {{- with .Values.termination.gracePeriodSeconds }}
terminationGracePeriodSeconds: {{ . }}
  {{- end }}
  {{- if .Values.initContainers }}
initContainers:
    {{- $initContainers := list }}
    {{- range $index, $key := (keys .Values.initContainers | uniq | sortAlpha) }}
      {{- $container := get $.Values.initContainers $key }}
      {{- if not $container.name -}}
        {{- $_ := set $container "name" $key }}
      {{- end }}
      {{- if $container.env -}}
        {{- $_ := set $ "ObjectValues" (dict "envVars" $container.env) -}}
        {{- $newEnv := fromYaml (include "bjw-s.common.lib.container.envVars" $) -}}
        {{- $_ := unset $.ObjectValues "envVars" -}}
        {{- $_ := set $container "env" $newEnv.env }}
      {{- end }}
      {{- $initContainers = append $initContainers $container }}
    {{- end }}
    {{- tpl (toYaml $initContainers) $ | nindent 2 }}
  {{- end }}
containers:
  {{- include "bjw-s.common.lib.controller.mainContainer" . | nindent 2 }}
  {{- with (merge .Values.sidecars .Values.additionalContainers) }}
    {{- $sidecarContainers := list }}
    {{- range $name, $container := . }}
      {{- if not $container.name -}}
        {{- $_ := set $container "name" $name }}
      {{- end }}
      {{- if $container.env -}}
        {{- $_ := set $ "ObjectValues" (dict "envVars" $container.env) -}}
        {{- $newEnv := fromYaml (include "bjw-s.common.lib.container.envVars" $) -}}
        {{- $_ := set $container "env" $newEnv.env }}
        {{- $_ := unset $.ObjectValues "envVars" -}}
      {{- end }}
      {{- $sidecarContainers = append $sidecarContainers $container }}
    {{- end }}
    {{- tpl (toYaml $sidecarContainers) $ | nindent 2 }}
  {{- end }}
  {{- with (include "bjw-s.common.lib.controller.volumes" . | trim) }}
volumes:
    {{- nindent 2 . }}
  {{- end }}
  {{- with .Values.hostAliases }}
hostAliases:
    {{- toYaml . | nindent 2 }}
  {{- end }}
  {{- with .Values.nodeSelector }}
nodeSelector:
    {{- toYaml . | nindent 2 }}
  {{- end }}
  {{- with .Values.affinity }}
affinity:
    {{- toYaml . | nindent 2 }}
  {{- end }}
  {{- with .Values.topologySpreadConstraints }}
topologySpreadConstraints:
    {{- toYaml . | nindent 2 }}
  {{- end }}
  {{- with .Values.tolerations }}
tolerations:
    {{- toYaml . | nindent 2 }}
  {{- end }}
  {{- with .Values.controller.restartPolicy }}
restartPolicy: {{ . }}
  {{- end }}
{{- end -}}
