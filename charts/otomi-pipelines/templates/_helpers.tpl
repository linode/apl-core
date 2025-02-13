{{/*
Expand the name of the chart.
*/}}
{{- define "otomi-pipelines.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "otomi-pipelines.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "otomi-pipelines.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "otomi-pipelines.labels" -}}
helm.sh/chart: {{ include "otomi-pipelines.chart" . }}
{{ include "otomi-pipelines.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "otomi-pipelines.selectorLabels" -}}
app.kubernetes.io/name: {{ include "otomi-pipelines.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "otomi-pipelines.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "otomi-pipelines.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- /*
  Helper for cloning a repository. It will wait for gitea to come up if not ready yet.
  Expected parameters:
    .CloneDepth - The git clone --depth value (e.g., "1" or "2")
    .DestDir    - (Optional) Destination directory (e.g., "$ENV_DIR")
    .Values     - The current .Values context
*/ -}}
{{- define "otomi-pipelines.cloneRepo" -}}
{{- if .Values.cloneUnsecure }}
while ! curl -m 3 -k -s -o /dev/null http://$GITEA_USERNAME:$GITEA_PASSWORD@$url; do
  echo "Waiting for the repository to be available"
  sleep 5s
done
git clone -c http.sslVerify=false --depth {{ .CloneDepth }}{{ if .DestDir }} http://$GITEA_USERNAME:$GITEA_PASSWORD@$url {{ .DestDir }}{{ else }} http://$GITEA_USERNAME:$GITEA_PASSWORD@$url{{ end }}
{{- else }}
while ! curl -m 3 -s -o /dev/null https://$GITEA_USERNAME:$GITEA_PASSWORD@$url; do
  echo "Waiting for the repository to be available"
  sleep 5s
done
git clone --depth {{ .CloneDepth }}{{ if .DestDir }} http://$GITEA_USERNAME:$GITEA_PASSWORD@$url {{ .DestDir }}{{ else }} http://$GITEA_USERNAME:$GITEA_PASSWORD@$url{{ end }}
{{- end }}
{{- end }}