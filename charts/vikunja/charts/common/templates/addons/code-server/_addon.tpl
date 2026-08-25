{{/*
Template to render code-server addon
It will include / inject the required templates based on the given values.
*/}}
{{- define "bjw-s.common.addon.codeserver" -}}
  {{- if .Values.addons.codeserver.enabled -}}
    {{/* Append the code-server container to the sidecars */}}
    {{- $container := include "bjw-s.common.addon.codeserver.container" . | fromYaml -}}
    {{- if $container -}}
      {{- $_ := set .Values.sidecars "addon-codeserver" $container -}}
    {{- end -}}

    {{/* Include the deployKeySecret if not empty */}}
    {{- if or .Values.addons.codeserver.git.deployKey .Values.addons.codeserver.git.deployKeyBase64 -}}
      {{- $deployKeySecret := include "bjw-s.common.addon.codeserver.deployKeySecret" . -}}
      {{- if $deployKeySecret -}}
        {{- $_ := set .Values.secrets "addon-codeserver-deploykey" (dict "enabled" true "stringData" ($deployKeySecret | fromYaml)) -}}
      {{- end -}}
    {{- end -}}

    {{/* Append the secret volume to the volumes */}}
    {{- if or .Values.addons.codeserver.git.deployKey .Values.addons.codeserver.git.deployKeyBase64 .Values.addons.codeserver.git.deployKeySecret }}
      {{- $volume := include "bjw-s.common.addon.codeserver.deployKeyVolumeSpec" . | fromYaml -}}
      {{- if $volume -}}
        {{- $_ := set .Values.persistence "deploykey" (dict "enabled" true "mountPath" "-" "type" "custom" "volumeSpec" $volume) -}}
      {{- end -}}
    {{- end -}}

    {{/* Add the code-server service */}}
    {{- if .Values.addons.codeserver.service.enabled -}}
      {{- $serviceValues := .Values.addons.codeserver.service -}}
      {{- $_ := set $serviceValues "nameOverride" "addon-codeserver" -}}
      {{- $_ := set $ "ObjectValues" (dict "service" $serviceValues) -}}
      {{- include "bjw-s.common.class.service" $ -}}
      {{- $_ := unset $.ObjectValues "service" -}}
    {{- end -}}

    {{/* Add the code-server ingress */}}
    {{- $svcName := printf "%v-addon-codeserver" (include "bjw-s.common.lib.chart.names.fullname" .) -}}
    {{- $svcPort := .Values.addons.codeserver.service.ports.codeserver.port -}}
    {{- range $_, $host := .Values.addons.codeserver.ingress.hosts -}}
      {{- $_ := set (index $host.paths 0) "service" (dict "name" $svcName "port" $svcPort) -}}
    {{- end -}}
    {{- $_ := set .Values.ingress "addon-codeserver" .Values.addons.codeserver.ingress -}}
  {{- end -}}
{{- end -}}
