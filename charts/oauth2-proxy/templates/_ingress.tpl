{{/*
Returns `true` if the API `ingressClassName` field is supported and `false` otherwise
*/}}
{{- define "ingress.supportsIngressClassName" -}}
{{- if ( semverCompare "<1.18-0" ( .Values.kubeVersion | default .Capabilities.KubeVersion.Version ) ) -}}
{{- print "false" -}}
{{- else -}}
{{- print "true" -}}
{{- end -}}
{{- end -}}

{{/*
Returns `true` if the API `pathType` field is supported and `false` otherwise
*/}}
{{- define "ingress.supportsPathType" -}}
{{- if ( semverCompare "<1.18-0" ( .Values.kubeVersion | default .Capabilities.KubeVersion.Version ) ) -}}
{{- print "false" -}}
{{- else -}}
{{- print "true" -}}
{{- end -}}
{{- end -}}

{{/*
Returns the appropriate ingress `backend` fields depending on the Kubernetes API version.
e.g.: `{{ include "common.ingress.backend" (dict "serviceName" "backendName" "servicePort" "backendPort" "context" $) }}`
Where the dict must contain the following entries:
- `serviceName` {String} - Name of an existing service backend
- `servicePort` {String|Number} - Port name or port number of the service.
- `context` {Dict} - (Parent) Context for the template evaluation required for the API version detection.
*/}}
{{- define "ingress.backend" -}}
{{- $apiVersion := ( include "capabilities.ingress.apiVersion" .context ) -}}
{{- if or ( eq $apiVersion "extensions/v1beta1" ) ( eq $apiVersion "networking.k8s.io/v1beta1" ) -}}
serviceName: {{ .serviceName }}
servicePort: {{ .servicePort }}
{{- else -}}
service:
  name: {{ .serviceName }}
  port:
    {{- if typeIs "string" .servicePort }}
    name: {{ .servicePort }}
    {{- else if or ( typeIs "int" .servicePort ) ( typeIs "float64" .servicePort ) }}
    number: {{ .servicePort }}
    {{- end }}
{{- end -}}
{{- end -}}
