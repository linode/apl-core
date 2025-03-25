{{- define "tempo.ingesterImagePullSecrets" -}}
{{- $dict := dict "tempo" .Values.tempo.image "component" .Values.ingester.image "global" .Values.global.image -}}
{{- include "tempo.imagePullSecrets" $dict -}}
{{- end }}
{{- define "ingester.zoneAwareReplicationMap" -}}
{{- $zonesMap := (dict) -}}
{{- $defaultZone := (dict "affinity" .ctx.Values.ingester.affinity "nodeSelector" .ctx.Values.ingester.nodeSelector "replicas" .ctx.Values.ingester.replicas "storageClass" .ctx.Values.ingester.storageClass) -}}
{{- if .ctx.Values.ingester.zoneAwareReplication.enabled -}}
{{- $numberOfZones := len .ctx.Values.ingester.zoneAwareReplication.zones -}}
{{- if lt $numberOfZones 3 -}}
{{- fail "When zone-awareness is enabled, you must have at least 3 zones defined." -}}
{{- end -}}
{{- $requestedReplicas := .ctx.Values.ingester.replicas -}}
{{- $replicaPerZone := div (add $requestedReplicas $numberOfZones -1) $numberOfZones -}}
{{- range $idx, $rolloutZone := .ctx.Values.ingester.zoneAwareReplication.zones -}}
{{- $extraAffinity := $rolloutZone.extraAffinity | default (dict) -}}
{{- $zoneAntiAffinity := include "ingester.zoneAntiAffinity" (dict "rolloutZoneName" $rolloutZone.name "topologyKey" $.ctx.Values.ingester.zoneAwareReplication.topologyKey) | fromYaml -}}
{{- $mergedAffinity := mergeOverwrite $extraAffinity $zoneAntiAffinity -}}
{{- $_ := set $zonesMap $rolloutZone.name (dict "affinity" $mergedAffinity "nodeSelector" ($rolloutZone.nodeSelector | default (dict)) "replicas" $replicaPerZone  "storageClass" $rolloutZone.storageClass) -}}
{{- end -}}
{{- else -}}
{{- $_ := set $zonesMap "" $defaultZone -}}
{{- end -}}
{{- $zonesMap | toYaml }}
{{- end -}}
{{/*
Calculate anti-affinity for a zone
Params:
  rolloutZoneName = name of the rollout zone
  topologyKey = topology key
*/}}
{{- define "ingester.zoneAntiAffinity" -}}
{{- if .topologyKey -}}
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
              - key: rollout-group
                operator: In
                values:
                  - ingester
              - key: zone
                operator: NotIn
                values:
                  - {{ .rolloutZoneName }}
          topologyKey: {{ .topologyKey | quote }}
{{- else -}}
{}
{{- end -}}
{{- end -}}

{{/*
Calculate annotations with zone-awareness
Params:
  ctx = . context
  component = component name
  rolloutZoneName = rollout zone name (optional)
*/}}
{{- define "ingester.Annotations" -}}
{{- if and .ctx.Values.ingester.zoneAwareReplication.maxUnavailable .rolloutZoneName }}
{{- $map := dict "rollout-max-unavailable" (.ctx.Values.ingester.zoneAwareReplication.maxUnavailable | toString) -}}
{{- toYaml (deepCopy $map | mergeOverwrite .ctx.Values.ingester.annotations) }}
{{- else -}}
{{ toYaml .ctx.Values.ingester.annotations }}
{{- end -}}
{{- end -}}

{{/*
ingester labels
*/}}
{{- define "ingester.labels" -}}
{{- if and .ctx.Values.ingester.zoneAwareReplication.enabled .rolloutZoneName }}
name: {{ printf "%s-%s" .component .rolloutZoneName }}
rollout-group: {{ .component }}
zone: {{ .rolloutZoneName }}
{{- end }}
helm.sh/chart: {{ include "tempo.chart" .ctx }}
app.kubernetes.io/name: {{ include "tempo.name" .ctx }}
app.kubernetes.io/instance: {{ .ctx.Release.Name }}
{{- if .component }}
app.kubernetes.io/component: {{ .component }}
{{- end }}
{{- if .memberlist }}
app.kubernetes.io/part-of: memberlist
{{- end }}
{{- if .ctx.Chart.AppVersion }}
app.kubernetes.io/version: {{ .ctx.Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .ctx.Release.Service }}
{{- end -}}
{{/*
Resource name template
*/}}
{{- define "ingester.resourceName" -}}
{{- $resourceName := include "tempo.fullname" .ctx -}}
{{- if .component -}}{{- $resourceName = printf "%s-%s" $resourceName .component -}}{{- end -}}
{{- if .rolloutZoneName -}}{{- $resourceName = printf "%s-%s" $resourceName .rolloutZoneName -}}{{- end -}}
{{- $resourceName -}}
{{- end -}}


{{/*
ingester selector labels
Params:
  ctx = . context
  component = name of the component
  rolloutZoneName = rollout zone name (optional)
*/}}
{{- define "ingester.selectorLabels" -}}
{{- if .ctx.Values.enterprise.legacyLabels }}
{{- if .component -}}
app: {{ include "tempo.name" .ctx }}-{{ .component }}
{{- end }}
release: {{ .ctx.Release.Name }}
{{- else -}}
app.kubernetes.io/name: {{ include "tempo.name" .ctx }}
app.kubernetes.io/instance: {{ .ctx.Release.Name }}
{{- if .component }}
app.kubernetes.io/component: {{ .component }}
{{- end }}
{{- end -}}
{{- if .rolloutZoneName }}
{{-   if not .component }}
{{-     printf "Component name cannot be empty if rolloutZoneName (%s) is set" .rolloutZoneName | fail }}
{{-   end }}
rollout-group: {{ .component }}
zone: {{ .rolloutZoneName }}
{{- end }}
{{- end -}}

{{/*
ingester POD labels
Params:
  ctx = . context
  component = name of the component
  memberlist = true if part of memberlist gossip ring
  rolloutZoneName = rollout zone name (optional)
*/}}
{{- define "ingester.podLabels" -}}
{{ with .ctx.Values.global.podLabels -}}
{{ toYaml . }}
{{ end }}
{{- if .ctx.Values.enterprise.legacyLabels }}
{{- if .component -}}
app: {{ include "tempo.name" .ctx }}-{{ .component }}
{{- if not .rolloutZoneName }}
name: {{ .component }}
{{- end }}
{{- end }}
{{- if .memberlist }}
gossip_ring_member: "true"
{{- end -}}
{{- if .component }}
target: {{ .component }}
release: {{ .ctx.Release.Name }}
{{- end }}
{{- else -}}
helm.sh/chart: {{ include "tempo.chart" .ctx }}
app.kubernetes.io/name: {{ include "tempo.name" .ctx }}
app.kubernetes.io/instance: {{ .ctx.Release.Name }}
app.kubernetes.io/version: {{ .ctx.Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .ctx.Release.Service }}
{{- if .component }}
app.kubernetes.io/component: {{ .component }}
{{- end }}
{{- if .memberlist }}
app.kubernetes.io/part-of: memberlist
{{- end }}
{{- end }}
{{- with .ctx.Values.ingester.podLabels }}
{{ toYaml . }}
{{- end }}
{{- if .rolloutZoneName }}
{{-   if not .component }}
{{-     printf "Component name cannot be empty if rolloutZoneName (%s) is set" .rolloutZoneName | fail }}
{{-   end }}
name: "{{ .component }}-{{ .rolloutZoneName }}" {{- /* Currently required for rollout-operator. https://github.com/grafana/rollout-operator/issues/15 */}}
rollout-group: ingester
zone: {{ .rolloutZoneName }}
{{- end }}
{{- end -}}
