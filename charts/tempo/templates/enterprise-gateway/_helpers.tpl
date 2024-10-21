{{/*
Return the appropriate apiVersion for ingress.
*/}}
{{- define "tempo.ingress.apiVersion" -}}
  {{- if and (.Capabilities.APIVersions.Has "networking.k8s.io/v1") (semverCompare ">= 1.19-0" .Capabilities.KubeVersion.Version) -}}
      {{- print "networking.k8s.io/v1" -}}
  {{- else if .Capabilities.APIVersions.Has "networking.k8s.io/v1beta1" -}}
    {{- print "networking.k8s.io/v1beta1" -}}
  {{- else -}}
    {{- print "extensions/v1beta1" -}}
  {{- end -}}
{{- end -}}

{{/*
Return if ingress is stable.
*/}}
{{- define "tempo.ingress.isStable" -}}
  {{- eq (include "tempo.ingress.apiVersion" .) "networking.k8s.io/v1" -}}
{{- end -}}

{{/*
Return if ingress supports ingressClassName.
*/}}
{{- define "tempo.ingress.supportsIngressClassName" -}}
  {{- or (eq (include "tempo.ingress.isStable" .) "true") (and (eq (include "tempo.ingress.apiVersion" .) "networking.k8s.io/v1beta1") (semverCompare ">= 1.18-0" .Capabilities.KubeVersion.Version)) -}}
{{- end -}}

{{/*
Return if ingress supports pathType.
*/}}
{{- define "tempo.ingress.supportsPathType" -}}
  {{- or (eq (include "tempo.ingress.isStable" .) "true") (and (eq (include "tempo.ingress.apiVersion" .) "networking.k8s.io/v1beta1") (semverCompare ">= 1.18-0" .Capabilities.KubeVersion.Version)) -}}
{{- end -}}

{{/*
enterpriseGateway imagePullSecrets
*/}}
{{- define "tempo.enterpriseGatewayImagePullSecrets" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.enterpriseGateway.image "global" .Values.global.image -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
