{{/*
Allow the release namespace to be overridden for multi-namespace deployments in combined charts
*/}}
{{- define "cloudnative-pg.namespace" -}}
  {{- if .Values.namespaceOverride -}}
    {{- .Values.namespaceOverride -}}
  {{- else -}}
    {{- .Release.Namespace -}}
  {{- end -}}
{{- end -}}

{{/*
Expand the name of the chart.
*/}}
{{- define "cloudnative-pg.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "cloudnative-pg.fullname" -}}
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
{{- define "cloudnative-pg.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "cloudnative-pg.labels" -}}
helm.sh/chart: {{ include "cloudnative-pg.chart" . }}
{{ include "cloudnative-pg.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "cloudnative-pg.selectorLabels" -}}
app.kubernetes.io/name: {{ include "cloudnative-pg.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Cluster-scoped resource name, unique per namespace when clusterWide is false.
*/}}
{{- define "cloudnative-pg.clusterResourceName" -}}
{{- if not .Values.config.clusterWide -}}
{{- printf "%s-%s" (include "cloudnative-pg.fullname" .) (include "cloudnative-pg.namespace" .) -}}
{{- else -}}
{{- include "cloudnative-pg.fullname" . -}}
{{- end -}}
{{- end -}}

{{/*
JSON list of the namespaces watched by the operator, empty when it watches all
of them: the WATCH_NAMESPACE list from config.data, otherwise the release
namespace when clusterWide is false.
*/}}
{{- define "cloudnative-pg.watchedNamespaces" -}}
{{- $namespaces := list -}}
{{- if .Values.config.create -}}
{{- range splitList "," ((.Values.config.data | default dict).WATCH_NAMESPACE | default "") -}}
{{- if trim . -}}
{{- $namespaces = append $namespaces (trim .) -}}
{{- end -}}
{{- end -}}
{{- end -}}
{{- if and (not $namespaces) (not .Values.config.clusterWide) -}}
{{- $namespaces = list (include "cloudnative-pg.namespace" .) -}}
{{- end -}}
{{- toJson ($namespaces | uniq) -}}
{{- end -}}

{{/*
JSON list of the namespaces receiving the operator Role when clusterWide is
false: the release namespace, plus the watched ones.
*/}}
{{- define "cloudnative-pg.roleNamespaces" -}}
{{- $namespaces := list (include "cloudnative-pg.namespace" .) -}}
{{- $namespaces = concat $namespaces (include "cloudnative-pg.watchedNamespaces" . | fromJsonArray) -}}
{{- toJson ($namespaces | uniq) -}}
{{- end -}}

{{/*
namespaceSelector restricting a webhook to the watched namespaces.
*/}}
{{- define "cloudnative-pg.webhookNamespaceSelector" -}}
{{- if not .Values.config.clusterWide -}}
namespaceSelector:
  matchExpressions:
  - key: kubernetes.io/metadata.name
    operator: In
    values:
    {{- range include "cloudnative-pg.watchedNamespaces" . | fromJsonArray }}
    - {{ . | quote }}
    {{- end }}
{{- end -}}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "cloudnative-pg.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "cloudnative-pg.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Define the common set of rules that can be applied either with
namespace scope or clusterwide
*/}}
{{- define "cloudnative-pg.commonRules" }}
- apiGroups:
  - ""
  resources:
  - configmaps
  - secrets
  - services
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - ""
  resources:
  - configmaps/status
  - secrets/status
  verbs:
  - get
  - patch
  - update
- apiGroups:
  - ""
  resources:
  - events
  verbs:
  - create
  - patch
- apiGroups:
  - ""
  resources:
  - persistentvolumeclaims
  - pods
  - pods/exec
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - watch
- apiGroups:
  - ""
  resources:
  - pods/status
  verbs:
  - get
- apiGroups:
  - ""
  resources:
  - serviceaccounts
  verbs:
  - create
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - apps
  resources:
  - deployments
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - batch
  resources:
  - jobs
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - watch
- apiGroups:
  - coordination.k8s.io
  resources:
  - leases
  verbs:
  - create
  - delete
  - get
  - list
  - update
  - watch
- apiGroups:
  - discovery.k8s.io
  resources:
  - endpointslices
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - monitoring.coreos.com
  resources:
  - podmonitors
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - watch
- apiGroups:
  - policy
  resources:
  - poddisruptionbudgets
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - postgresql.cnpg.io
  resources:
  - backups
  - clusters
  - databaseroles
  - databases
  - poolers
  - publications
  - scheduledbackups
  - subscriptions
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - postgresql.cnpg.io
  resources:
  - failoverquorums
  verbs:
  - create
  - delete
  - get
  - list
  - watch
- apiGroups:
  - postgresql.cnpg.io
  resources:
  - backups/status
  - databases/status
  - publications/status
  - scheduledbackups/status
  - subscriptions/status
  verbs:
  - get
  - patch
  - update
- apiGroups:
  - postgresql.cnpg.io
  resources:
  - imagecatalogs
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - postgresql.cnpg.io
  resources:
  - clusters/finalizers
  - databaseroles/finalizers
  - poolers/finalizers
  verbs:
  - update
- apiGroups:
  - postgresql.cnpg.io
  resources:
  - clusters/status
  - databaseroles/status
  - poolers/status
  - failoverquorums/status
  verbs:
  - get
  - patch
  - update
  - watch
- apiGroups:
  - rbac.authorization.k8s.io
  resources:
  - rolebindings
  - roles
  verbs:
  - create
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - snapshot.storage.k8s.io
  resources:
  - volumesnapshots
  verbs:
  - create
  - get
  - list
  - patch
  - watch
{{- end }}

{{/*
Define the set of rules that must be applied clusterwide
*/}}
{{- define "cloudnative-pg.clusterwideRules" }}
- apiGroups:
  - ""
  resources:
  - nodes
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - admissionregistration.k8s.io
  resources:
  - mutatingwebhookconfigurations
  - validatingwebhookconfigurations
  verbs:
  - get
  - patch
- apiGroups:
  - postgresql.cnpg.io
  resources:
  - clusterimagecatalogs
  verbs:
  - get
  - list
  - watch
{{- end }}
