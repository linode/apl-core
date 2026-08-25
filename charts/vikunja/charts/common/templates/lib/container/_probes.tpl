{{/*
Probes selection logic.
*/}}
{{- define "bjw-s.common.lib.container.probes" -}}
  {{- $primaryService := get .Values.service (include "bjw-s.common.lib.service.primary" .) -}}
  {{- $primaryPort := "" -}}
  {{- if $primaryService -}}
    {{- $primaryPort = get $primaryService.ports (include "bjw-s.common.lib.service.primaryPort" (dict "serviceName" (include "bjw-s.common.lib.service.primary" .) "values" $primaryService)) -}}
  {{- end -}}

  {{- range $probeName, $probe := .Values.probes -}}
    {{- if $probe.enabled -}}
      {{- $probeOutput := "" -}}
      {{- if $probe.custom -}}
        {{- if $probe.spec -}}
          {{- $probeOutput = $probe.spec | toYaml -}}
        {{- end -}}
      {{- else -}}
        {{- if $primaryPort -}}
          {{- $probeType := "" -}}
          {{- if eq $probe.type "AUTO" -}}
            {{- $probeType = $primaryPort.protocol -}}
          {{- else -}}
            {{- $probeType = $probe.type | default "TCP" -}}
          {{- end -}}

          {{- $probeDefinition := dict
            "initialDelaySeconds" $probe.spec.initialDelaySeconds
            "failureThreshold" $probe.spec.failureThreshold
            "timeoutSeconds" $probe.spec.timeoutSeconds
            "periodSeconds" $probe.spec.periodSeconds
          -}}

          {{- $probeHeader := "" -}}
          {{- if or ( eq $probeType "HTTPS" ) ( eq $probeType "HTTP" ) -}}
            {{- $probeHeader = "httpGet" -}}

            {{- $_ := set $probeDefinition $probeHeader (
              dict
                "path" $probe.path
                "scheme" $probeType
              )
            -}}
          {{- else }}
            {{- $probeHeader = "tcpSocket" -}}
            {{- $_ := set $probeDefinition $probeHeader dict -}}
          {{- end -}}

          {{- if $probe.port }}
            {{- $_ := set (index $probeDefinition $probeHeader) "port" (tpl ( $probe.port | toString ) $) -}}
          {{- else if $primaryPort.targetPort }}
            {{- $_ := set (index $probeDefinition $probeHeader) "port" $primaryPort.targetPort -}}
          {{- else }}
            {{- $_ := set (index $probeDefinition $probeHeader) "port" ($primaryPort.port | toString | atoi ) -}}
          {{- end }}

          {{- $probeOutput = $probeDefinition | toYaml | trim -}}
        {{- end -}}
      {{- end -}}

      {{- if $probeOutput -}}
        {{- printf "%sProbe:" $probeName | nindent 0 -}}
        {{- $probeOutput | nindent 2 -}}
      {{- end -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
