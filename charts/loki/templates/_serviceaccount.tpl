{{- define "loki.serviceAccount" }}
{{- $target := .target }}
{{- $ctx := .ctx }}
{{- $component := .component }}
{{- $name := .name }}
{{- with $ctx }}
{{- if $component.serviceAccount.create -}}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ $name | default (include "loki.serviceAccountName" (dict "ctx" $ctx "component" $component "target" $target)) }}
  namespace: {{ include "loki.namespace" $ctx }}
  labels:
    {{- include "loki.labels" . | nindent 4 }}
    {{- with $target }}
    app.kubernetes.io/component: {{ . }}
    {{- end }}
    {{- with $component.serviceAccount.labels }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
  {{- with $component.serviceAccount.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
automountServiceAccountToken: {{ $component.serviceAccount.automountServiceAccountToken }}
{{- with $component.serviceAccount.imagePullSecrets }}
imagePullSecrets:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}
{{- end }}
{{- end }}
