{{/*
Default NOTES.txt content.
*/}}
{{- define "bjw-s.common.lib.chart.notes" -}}

{{- $primaryIngress := get .Values.ingress (include "bjw-s.common.lib.ingress.primary" .) -}}
{{- $primaryService := get .Values.service (include "bjw-s.common.lib.service.primary" .) -}}
{{- $primaryPort := "" -}}
{{- if $primaryService -}}
  {{- $primaryPort = get $primaryService.ports (include "bjw-s.common.lib.service.primaryPort" (dict "serviceName" (include "bjw-s.common.lib.service.primary" .) "values" $primaryService)) -}}
{{- end -}}

{{- $prefix := "http" -}}
{{- if $primaryPort }}
  {{- if hasKey $primaryPort "protocol" }}
  {{- if eq $primaryPort.protocol "HTTPS" }}
    {{- $prefix = "https" }}
  {{- end }}
  {{- end }}
{{- end }}

{{- if $primaryIngress }}
1. Access the application by visiting one of these URL's:
{{ range $primaryIngress.hosts }}
  {{- $prefix = "http" -}}
  {{ if $primaryIngress.tls -}}
    {{- $prefix = "https" -}}
  {{ end -}}
  {{- $host := .host -}}
  {{ if .hostTpl -}}
    {{- $host = tpl .hostTpl $ -}}
  {{ end }}
  {{- $path := (first .paths).path | default "/" -}}
  {{ if (first .paths).pathTpl -}}
    {{- $path = tpl (first .paths).pathTpl $ -}}
  {{ end }}
  - {{ $prefix }}://{{- $host }}{{- $path }}
{{- end }}
{{- else if and $primaryService $primaryPort }}
1. Get the application URL by running these commands:
{{- if contains "NodePort" $primaryService.type }}
  export NODE_PORT=$(kubectl get --namespace {{ .Release.Namespace }} -o jsonpath="{.spec.ports[0].nodePort}" services {{ include "bjw-s.common.lib.chart.names.fullname" . }})
  export NODE_IP=$(kubectl get nodes --namespace {{ .Release.Namespace }} -o jsonpath="{.items[0].status.addresses[0].address}")
  echo {{ $prefix }}://$NODE_IP:$NODE_PORT
{{- else if contains "LoadBalancer" $primaryService.type }}
     NOTE: It may take a few minutes for the LoadBalancer IP to be available.
           You can watch the status of by running 'kubectl get svc -w {{ include "bjw-s.common.lib.chart.names.fullname" . }}'
  export SERVICE_IP=$(kubectl get svc --namespace {{ .Release.Namespace }} {{ include "bjw-s.common.lib.chart.names.fullname" . }} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
  echo {{ $prefix }}://$SERVICE_IP:{{ $primaryPort.port | toString | atoi }}
{{- else if contains "ClusterIP" $primaryService.type }}
  export POD_NAME=$(kubectl get pods --namespace {{ .Release.Namespace }} -l "app.kubernetes.io/name={{ include "bjw-s.common.lib.chart.names.name" . }},app.kubernetes.io/instance={{ .Release.Name }}" -o jsonpath="{.items[0].metadata.name}")
  echo "Visit {{ $prefix }}://127.0.0.1:8080 to use your application"
  kubectl port-forward $POD_NAME 8080:{{ $primaryPort.port | toString | atoi }}
{{- end }}
{{- end }}
{{- end -}}
