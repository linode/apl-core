{{/*
This template serves as a blueprint for all Route objects that are created
within the common library.
*/}}
{{- define "bjw-s.common.class.route" -}}
{{- $values := .Values.route -}}
{{- if hasKey . "ObjectValues" -}}
  {{- with .ObjectValues.route -}}
    {{- $values = . -}}
  {{- end -}}
{{ end -}}

{{- $fullName := include "bjw-s.common.lib.chart.names.fullname" . -}}
{{- if and (hasKey $values "nameOverride") $values.nameOverride -}}
  {{- $fullName = printf "%v-%v" $fullName $values.nameOverride -}}
{{ end -}}
{{- $routeKind := $values.kind | default "HTTPRoute" -}}
{{- $primaryService := get .Values.service (include "bjw-s.common.lib.service.primary" .) -}}
{{- $defaultServiceName := $fullName -}}
{{- if and (hasKey $primaryService "nameOverride") $primaryService.nameOverride -}}
  {{- $defaultServiceName = printf "%v-%v" $defaultServiceName $primaryService.nameOverride -}}
{{- end -}}
{{- $defaultServicePort := get $primaryService.ports (include "bjw-s.common.lib.service.primaryPort" (dict "values" $primaryService)) -}}
---
apiVersion: gateway.networking.k8s.io/v1alpha2
{{- if and (ne $routeKind "GRPCRoute") (ne $routeKind "HTTPRoute") (ne $routeKind "TCPRoute") (ne $routeKind "TLSRoute") (ne $routeKind "UDPRoute") }}
  {{- fail (printf "Not a valid route kind (%s)" $routeKind) }}
{{- end }}
kind: {{ $routeKind }}
metadata:
  name: {{ $fullName }}
  {{- with (merge ($values.labels | default dict) (include "bjw-s.common.lib.metadata.allLabels" $ | fromYaml)) }}
  labels: {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with (merge ($values.annotations | default dict) (include "bjw-s.common.lib.metadata.globalAnnotations" $ | fromYaml)) }}
  annotations: {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  parentRefs:
  {{- range $values.parentRefs }}
    - group: {{ default "gateway.networking.k8s.io" .group }}
      kind: {{ default "Gateway" .kind }}
      name: {{ required (printf "parentRef name is required for %v %v" $routeKind $fullName) .name }}
      namespace: {{ required (printf "parentRef namespace is required for %v %v" $routeKind $fullName) .namespace }}
      {{- if .sectionName }}
      sectionName: {{ .sectionName | quote }}
      {{- end }}
  {{- end }}
  {{- if and (ne $routeKind "TCPRoute") (ne $routeKind "UDPRoute") $values.hostnames }}
  hostnames:
  {{- with $values.hostnames }}
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- end }}
  rules:
  {{- range $values.rules }}
  - backendRefs:
    {{- range .backendRefs }}
    - group: {{ default "" .group | quote}}
      kind: {{ default "Service" .kind }}
      name: {{ default $defaultServiceName .name }}
      namespace: {{ default $.Release.Namespace .namespace }}
      port: {{ default $defaultServicePort.port .port }}
      weight: {{ default 1 .weight }}
    {{- end }}
    {{- if (eq $routeKind "HTTPRoute") }}
      {{- with .matches }}
    matches:
        {{- toYaml . | nindent 6 }}
      {{- end }}
    {{- end }}
  {{- end }}
{{- end }}
