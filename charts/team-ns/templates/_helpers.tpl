{{- define "team-ns.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "team-ns.chart-labels" -}}
app: {{ template "team-ns.name" . }}
app.kubernetes.io/name: {{ template "team-ns.name" . }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
app.kubernetes.io/version: {{ .Chart.Version }}
app.kubernetes.io/part-of: otomi
helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
otomi.io/team: {{ .Values.teamId }}
{{- end -}}

{{- define "helm-toolkit.utils.joinListWithSep" -}}
{{- $local := dict "first" true -}}
{{- $ := . -}}
{{- range $k, $v := .list -}}{{- if not $local.first -}}{{ $.sep }}{{- end -}}{{- $v -}}{{- $_ := set $local "first" false -}}{{- end -}}
{{- end -}}

{{- define "flatten-name" -}}
{{- $res := regexReplaceAll "[()/_-]{1}" . "" -}}
{{- regexReplaceAll "[|.]{1}" $res "-" | trimAll "-" | lower -}}
{{- end -}}

{{- define "dockercfg" -}}
{"auths":{"{{ .server }}":{"username":"{{ .username }}","password":"{{ .password | replace "\"" "\\\"" }}","email":"not@val.id","auth":"{{ print .username ":" .password | b64enc}}"}}}
{{- end -}}

{{- define "itemsByName" -}}
{{- range $i := . }}
{{ $i.name }}:
{{ $i | toYaml | nindent 2 }}
{{- end }}
{{- end -}}

{{/*
Kyverno CEL policy helpers (policies.kyverno.io NamespacedValidatingPolicy)
*/}}

{{/* Map the APL policy action (Audit | Enforce) to Kyverno validationActions */}}
{{- define "team-ns.policy.validationActions" -}}
{{- if eq (toString .) "Enforce" -}}
[Deny]
{{- else -}}
[Audit]
{{- end -}}
{{- end -}}

{{/* Common spec fields: actions, failure policy, background scanning and Pod matching.
     Note: do not add objectSelector or excludeResourceRules here, that disables autogen for pod controllers. */}}
{{- define "team-ns.policy.podSpec" -}}
validationActions: {{ include "team-ns.policy.validationActions" .action }}
failurePolicy: Fail
evaluation:
  background:
    enabled: true
matchConstraints:
  resourceRules:
    - apiGroups: [""]
      apiVersions: [v1]
      operations: [CREATE, UPDATE]
      resources: [pods]
{{- end -}}

{{/* CEL expression that is true when the Pod is NOT a Tekton build/scan/git task Pod */}}
{{- define "team-ns.policy.notTektonTask" -}}
!(object.metadata.?annotations[?'tekton.dev/tags'].orValue('') in ['image-build', 'CLI, grype', 'git'])
{{- end -}}

{{/* CEL variable with all containers of a Pod (ephemeral, init and regular) */}}
{{- define "team-ns.policy.allContainersVar" -}}
- name: allContainers
  expression: >-
    object.spec.containers +
    object.spec.?initContainers.orValue([]) +
    object.spec.?ephemeralContainers.orValue([])
{{- end -}}

{{/* CEL expression that is true for images exempted from securityContext checks (istio proxy, otel autoinstrumentation) */}}
{{- define "team-ns.policy.isExemptImage" -}}
(c.image.contains('/istio/proxyv2') || c.image.startsWith('ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-'))
{{- end -}}

{{/* Convert a Kyverno style wildcard pattern (* and ?) to an anchored RE2 regex */}}
{{- define "team-ns.policy.globToRegex" -}}
^{{ regexQuoteMeta (toString .) | replace "\\*" ".*" | replace "\\?" "." }}$
{{- end -}}

{{- define "common.capabilities.kubeVersion" -}}
{{- default .Capabilities.KubeVersion.Version .Values.kubeVersionOverride -}}
{{- end -}}

{{/* aggregate all the files and create a dict by dirname > list (filename content) */}}
{{- define "file-volumes" }}
{{- $vols := dict }}
{{- range $location, $content := .files }}
  {{- $dir := $location | dir }}
  {{- $file := $location | base }}
  {{- $fileContent := (dict "name" $file "content" $content) }}
  {{- $files := list }}
  {{- if hasKey $vols $dir }}
    {{- $files = (index $vols $dir) }}
  {{- end }}
  {{- $files = append $files $fileContent }}
  {{- $vols = set $vols $dir $files }}
{{- end }}
{{- range $dir, $files := $vols }}
{{ $dir }}: {{- $files | toYaml | nindent 2 }}
{{- end }}
{{- end }}
