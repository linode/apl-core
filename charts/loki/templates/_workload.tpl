{{/*
Workload helper
*/}}

{{- define "loki.component" -}}
{{- include "loki.component.workload" . }}
{{- if and .ctx.Release.IsUpgrade (eq .component.kind "StatefulSet") }}
---
{{- include "loki.component.workload.recreate" . }}
{{- end }}
{{- end }}

{{- define "loki.component.workload" }}
{{- $target := .target }}
{{- $ctx := .ctx }}
{{- $component := .component }}
{{- $name := .name }}
{{- $headlessName := .headlessName }}
{{- $args := .args }}
{{- $memberlist := hasKey . "memberlist" | ternary .memberlist true -}}
{{- with $ctx }}
{{- if $component.enabled }}
apiVersion: apps/v1
kind: {{ $component.kind }}
metadata:
  name: "{{ $name | default (include "loki.workloadResourceName" (dict "ctx" $ctx "component" $target "componentValues" $component)) }}"
  namespace: "{{ include "loki.namespace" . }}"
  labels:
    {{- include "loki.labels" . | nindent 4 }}
    app.kubernetes.io/component: {{ $target }}
    {{- with (mergeOverwrite (dict) .Values.defaults.labels $component.labels) }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
  {{- with (mergeOverwrite (dict) .Values.defaults.annotations .Values.loki.annotations $component.annotations) }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
{{- if and (not (dig "autoscaling" "enabled" false $component)) (not (dig "kedaAutoscaling" "enabled" false $component)) (not (kindIs "invalid" $component.replicas)) }}
  replicas: {{ if eq $target "single-binary" }}{{ include "loki.monolithicReplicas" $ctx }}{{ else }}{{ $component.replicas }}{{ end }}
{{- end }}
  {{- if eq $component.kind "StatefulSet" }}
  {{- with $component.podManagementPolicy }}
  podManagementPolicy: {{ . }}
  {{- end }}
  {{- with $component.strategy }}
  updateStrategy:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  serviceName: {{ $headlessName | default (include "loki.resourceName" (dict "ctx" $ctx "component" $target "suffix" "headless")) }}
  {{- if and (or (dig "persistence" "volumeClaimsEnabled" false $component) (dig "persistence" "enabled" false $component)) $component.persistence.enableStatefulSetAutoDeletePVC }}
  persistentVolumeClaimRetentionPolicy:
    whenDeleted: {{ $component.persistence.whenDeleted }}
    whenScaled: {{ $component.persistence.whenScaled }}
  {{- end }}
  {{- else }}
  {{- with $component.strategy }}
  strategy:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- end }}
  revisionHistoryLimit: {{ .Values.loki.revisionHistoryLimit }}
  selector:
    matchLabels:
      {{- include "loki.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: {{ $target }}
  template:
    {{- include "loki.podTemplate" (dict "target" $target "component" $component "ctx" $ctx "memberlist" $memberlist "args" $args) | nindent 4 }}
  {{- if and (or (dig "persistence" "volumeClaimsEnabled" false $component) (dig "persistence" "enabled" false $component)) (eq (dig "persistence" "type" "pvc" $component) "pvc") }}
    {{- if and (eq $component.kind "Deployment") (gt (int $component.replicas) 1) }}
      {{- fail "Persistence with PVC is not supported for Deployment with more than 1 replica. Please use StatefulSet or set replicas to 1." }}
    {{- end }}
    {{- if and (eq $component.kind "StatefulSet") }}
  volumeClaimTemplates:
  {{- $dataClaimExists := false }}
  {{- range $component.persistence.claims }}
    {{- if eq .name "data" }}
      {{- $dataClaimExists = true }}
    {{- end }}
    - apiVersion: v1
      kind: PersistentVolumeClaim
      metadata:
        name: {{ .name }}
        {{- with .annotations }}
        annotations:
          {{- . | toYaml | nindent 10 }}
        {{- end }}
        {{- with .labels }}
        labels:
          {{- . | toYaml | nindent 10 }}
        {{- end }}
      spec:
        accessModes:
          {{- toYaml .accessModes | nindent 10 }}
        {{- with .storageClass }}
        storageClassName: {{ if (eq "-" .) }}""{{ else }}{{ . }}{{ end }}
        {{- end }}
        {{- with .volumeAttributesClassName }}
        volumeAttributesClassName: {{ . }}
        {{- end }}
        resources:
          requests:
            storage: {{ .size | quote }}
  {{- end }}
  {{- if (not $dataClaimExists) }}
    - apiVersion: v1
      kind: PersistentVolumeClaim
      metadata:
        name: {{ eq $target "single-binary" | ternary "storage" "data" }}
        {{- with $component.persistence.annotations }}
        annotations:
          {{- toYaml . | nindent 10 }}
        {{- end }}
        {{- with $component.persistence.labels }}
        labels:
          {{- toYaml . | nindent 10 }}
        {{- end }}
      spec:
        {{- with $component.persistence.storageClass }}
        storageClassName: {{ if (eq "-" .) }}""{{ else }}{{ . }}{{ end }}
        {{- end }}
        {{- with $component.persistence.accessModes }}
        accessModes:
          {{- toYaml . | nindent 10 }}
        {{- end }}
        {{- with $component.persistence.volumeAttributesClassName }}
        volumeAttributesClassName: {{ . }}
        {{- end }}
        resources:
          requests:
            storage: {{ $component.persistence.size | quote }}
        {{- with $component.persistence.selector }}
        selector:
          {{- toYaml . | nindent 14 }}
        {{- end }}
      {{- end }}
    {{- end }}
  {{- end }}
{{- end }}
{{- end }}
{{- end }}


{{- define "loki.component.workload.recreate" }}
{{- $target := .target }}
{{- $ctx := .ctx }}
{{- $component := .component }}
{{- $name := .name }}
{{- $headlessName := .headlessName }}
{{- $memberlist := hasKey . "memberlist" | ternary .memberlist true -}}
{{- if and $component.enabled $component.statefulSetRecreateJob.enabled -}}
{{- $newStatefulSet := include "loki.component.workload" . | fromYaml -}}
{{- with $ctx }}
  {{- $currentStatefulset := dict -}}
  {{- if $newStatefulSet -}}
    {{- $currentStatefulset = lookup $newStatefulSet.apiVersion $newStatefulSet.kind $newStatefulSet.metadata.namespace $newStatefulSet.metadata.name -}}
    {{- $needsRecreation := false -}}
    {{- $templates := dict -}}
    {{- if and $currentStatefulset (eq $currentStatefulset.metadata.name $newStatefulSet.metadata.name) -}}
      {{- $newPodManagementPolicy := dig "spec" "podManagementPolicy" "OrderedReady" $newStatefulSet -}}
      {{- $currentPodManagementPolicy := dig "spec" "podManagementPolicy" "OrderedReady" $currentStatefulset -}}
      {{- if ne $newPodManagementPolicy $currentPodManagementPolicy -}}
        {{- $needsRecreation = true -}}
      {{- end -}}
      {{- $newServiceName := dig "spec" "serviceName" "" $newStatefulSet -}}
      {{- $currentServiceName := dig "spec" "serviceName" "" $currentStatefulset -}}
      {{- if ne $newServiceName $currentServiceName -}}
        {{- $needsRecreation = true -}}
      {{- end -}}
      {{- $newVolumeClaimTemplates := dig "spec" "volumeClaimTemplates" (list) $newStatefulSet -}}
      {{- $currentVolumeClaimTemplates := dig "spec" "volumeClaimTemplates" (list) $currentStatefulset -}}
      {{- if ne (len $newVolumeClaimTemplates) (len $currentVolumeClaimTemplates) -}}
        {{- $needsRecreation = true -}}
      {{- else -}}
        {{- range $index, $newVolumeClaimTemplate := $newVolumeClaimTemplates -}}
          {{- $currentVolumeClaimTemplateSpec := dict -}}
            {{- range $oldVolumeClaimTemplate := $currentVolumeClaimTemplates -}}
              {{- if eq $oldVolumeClaimTemplate.metadata.name $newVolumeClaimTemplate.metadata.name -}}
                {{- $currentVolumeClaimTemplateSpec = $oldVolumeClaimTemplate.spec -}}
              {{- end -}}
            {{- end -}}
          {{- $newVolumeClaimTemplateStorageSize := $newVolumeClaimTemplate.spec.resources.requests.storage -}}
          {{- if not $currentVolumeClaimTemplateSpec -}}
            {{- $needsRecreation = true -}}
          {{- else -}}
            {{- if ne $newVolumeClaimTemplateStorageSize $currentVolumeClaimTemplateSpec.resources.requests.storage -}}
              {{- $needsRecreation = true -}}
              {{- $templates = set $templates $newVolumeClaimTemplate.metadata.name $newVolumeClaimTemplateStorageSize -}}
            {{- end -}}
          {{- end -}}
        {{- end -}}
      {{- end -}}
    {{- end -}}
    {{- if $needsRecreation -}}
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ $newStatefulSet.metadata.name }}-recreate"
  namespace: "{{ $newStatefulSet.metadata.namespace }}"
  labels:
    {{- include "loki.labels" . | nindent 4 }}
    app.kubernetes.io/component: "{{ $target }}-recreate-job"
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  ttlSecondsAfterFinished: 300
  template:
    metadata:
      labels:
        {{- include "loki.labels" . | nindent 8 }}
        app.kubernetes.io/component: {{ $target }}-recreate-job
    spec:
      restartPolicy: Never
      serviceAccountName: {{ $newStatefulSet.metadata.name }}-recreate
      initContainers:
        {{- if $ctx.Values.defaults.statefulSetRecreateJob.patchPVC }}
          {{- range $index := until (int $currentStatefulset.spec.replicas) }}
            {{- range $template, $size := $templates }}
        - name: patch-pvc-{{ $template }}-{{ $index }}
          image: {{ include "loki.image" (dict "component" $ctx.Values.defaults.statefulSetRecreateJob.image "global" $ctx.Values.global "defaultVersion" $ctx.Capabilities.KubeVersion.Version) }}
          args:
            - patch
            - pvc
            - --namespace={{ $newStatefulSet.metadata.namespace }}
            - {{ printf "%s-%s-%d" $template $newStatefulSet.metadata.name $index }}
            - --type=json
            - '-p=[{"op": "replace", "path": "/spec/resources/requests/storage", "value": "{{ $size }}"}]'
            {{- end }}
          {{- end }}
        {{- end }}
      containers:
        - name: recreate
          image: {{ include "loki.image" (dict "component" $ctx.Values.defaults.statefulSetRecreateJob.image "global" $ctx.Values.global "defaultVersion" $ctx.Capabilities.KubeVersion.Version) }}
          args:
            - delete
            - statefulset
            - --namespace={{ $newStatefulSet.metadata.namespace }}
            - --cascade=orphan
            - --wait=true
            - --ignore-not-found=true
            - {{ $newStatefulSet.metadata.name }}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ $newStatefulSet.metadata.name }}-recreate
  namespace: {{ $newStatefulSet.metadata.namespace }}
  labels:
    {{- include "loki.labels" . | nindent 4 }}
    app.kubernetes.io/component: {{ $target }}-recreate-job
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "-10"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: {{ $newStatefulSet.metadata.name }}-recreate
  namespace: {{ $newStatefulSet.metadata.namespace }}
  labels:
    {{- include "loki.labels" . | nindent 4 }}
    app.kubernetes.io/component: {{ $target }}-recreate-job
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "-10"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
rules:
  - apiGroups:
      - apps
    resources:
      - statefulsets
    resourceNames:
      - {{ $newStatefulSet.metadata.name }}
    verbs:
      - delete
  {{- if $templates }}
  - apiGroups:
      - ""
    resources:
      - persistentvolumeclaims
    resourceNames:
    {{- range $index := until (int $currentStatefulset.spec.replicas) }}
      {{- range $template := $templates | keys }}
      - {{ printf "%s-%s-%d" $template $newStatefulSet.metadata.name $index }}
      {{- end }}
    {{- end }}
    verbs:
      - patch
      - get
  {{- end }}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: {{ $newStatefulSet.metadata.name }}-recreate
  namespace: {{ $newStatefulSet.metadata.namespace }}
  labels:
    {{- include "loki.labels" . | nindent 4 }}
    app.kubernetes.io/component: {{ $target }}-recreate-job
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "-10"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
subjects:
  - kind: ServiceAccount
    name: {{ $newStatefulSet.metadata.name }}-recreate
    namespace: {{ $newStatefulSet.metadata.namespace }}
roleRef:
  kind: Role
  name: {{ $newStatefulSet.metadata.name }}-recreate
  apiGroup: rbac.authorization.k8s.io
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- end -}}
{{- end -}}
