{{/*
Returns the appropriate apiVersion for podDisruptionBudget object.
*/}}
{{- define "capabilities.podDisruptionBudget.apiVersion" -}}
{{- if semverCompare ">=1.21-0" ( .Values.kubeVersion | default .Capabilities.KubeVersion.Version ) -}}
{{- print "policy/v1" -}}
{{- else -}}
{{- print "policy/v1beta1" -}}
{{- end -}}
{{- end -}}

{{/*
Return the appropriate apiVersion for ingress object.
*/}}
{{- define "capabilities.ingress.apiVersion" -}}
{{- if semverCompare "<1.14-0" ( .Values.kubeVersion | default .Capabilities.KubeVersion.Version ) -}}
{{- print "extensions/v1beta1" -}}
{{- else if semverCompare "<1.19-0" ( .Values.kubeVersion | default .Capabilities.KubeVersion.Version ) -}}
{{- print "networking.k8s.io/v1beta1" -}}
{{- else -}}
{{- print "networking.k8s.io/v1" -}}
{{- end -}}
{{- end -}}
