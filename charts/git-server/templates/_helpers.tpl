{{/*
Selector labels
*/}}
{{- define "git-server.selectorLabels" -}}
app: git-server
{{- end }}

{{/*
Common labels
*/}}
{{- define "git-server.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{ include "git-server.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
