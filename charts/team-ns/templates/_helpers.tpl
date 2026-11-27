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

How these policies are evaluated:
  1. matchConstraints  - which resources/operations the policy applies to (Pods on CREATE/UPDATE)
  2. matchConditions   - every expression must be true, otherwise the policy is skipped (used for exclusions)
  3. variables         - named values, referenced as `variables.<name>`; a variable may use earlier variables
  4. validations       - every expression must be true, otherwise the request is denied/audited with `message`

CEL cheat sheet (with the old Kyverno JMESPath equivalent where useful):
  object                            the Pod being validated               (request.object)
  x.?a.?b.orValue(d)                x.a.b if set, otherwise d             ({{ x.a.b || d }})
  map[?'some/key'].orValue(d)       map lookup for keys with dots/slashes
  has(x.field)                      true if field is set
  list.all(c, <cond>)               every item matches                    (foreach + deny)
  list.exists(c, <cond>)            at least one item matches             (AnyIn)
  list.filter(c, <cond>)            items that match                      (foreach preconditions)
  list.map(c, <expr>)               transform every item
  value in [a, b]                   membership                            (AnyIn / AllIn)
  s.startsWith(p) / s.contains(p)   string checks                         ("prefix*" / "*part*")
  s.matches(re)                     RE2 regex match
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

{{/* CEL expression that is true when the Pod is a Tekton build/scan/git task Pod */}}
{{- define "team-ns.policy.isTektonTask" -}}
object.metadata.?annotations[?'tekton.dev/tags'].orValue('') in ['image-build', 'CLI, grype', 'git']
{{- end -}}

{{/* CEL expression that is true when the Pod is NOT a Tekton build/scan/git task Pod */}}
{{- define "team-ns.policy.notTektonTask" -}}
!({{ include "team-ns.policy.isTektonTask" . }})
{{- end -}}

{{/* matchCondition that skips the policy for Tekton build/scan/git task Pods */}}
{{- define "team-ns.policy.excludeTektonTasks" -}}
- name: exclude-tekton-tasks
  expression: {{ include "team-ns.policy.notTektonTask" . | quote }}
{{- end -}}

{{/* matchCondition that skips the policy for the team's own monitoring Pods and TTY Pods.
     Expects the team id as context. */}}
{{- define "team-ns.policy.excludeTeamMonitoringAndTty" -}}
- name: exclude-team-monitoring-and-tty
  expression: >-
    !(object.metadata.?labels[?'app.kubernetes.io/instance'].orValue('') in
      [{{ printf "%s-po-alertmanager" . | quote }}, {{ printf "prometheus-%s" . | quote }}, {{ printf "tekton-dashboard-%s" . | quote }}]) &&
    object.metadata.?labels[?'otomi'].orValue('') != 'tty'
{{- end -}}

{{/* CEL variable with all containers of a Pod (ephemeral, init and regular) */}}
{{- define "team-ns.policy.allContainersVar" -}}
- name: allContainers
  expression: >-
    object.spec.containers +
    object.spec.?initContainers.orValue([]) +
    object.spec.?ephemeralContainers.orValue([])
{{- end -}}

{{/* Image prefix of the otel autoinstrumentation init containers, pulled through the ORCS mirror when configured */}}
{{- define "team-ns.policy.otelAutoinstrumentationPrefix" -}}
{{- with .Values.linodeLkeImageRepository -}}
{{ . }}/ghcr/open-telemetry/opentelemetry-operator/autoinstrumentation-
{{- else -}}
ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-
{{- end -}}
{{- end -}}

{{/* CEL expression that is true for images exempted from securityContext checks (istio proxy, otel autoinstrumentation).
     Expects the root context. */}}
{{- define "team-ns.policy.isExemptImage" -}}
(c.image.contains('/istio/proxyv2') || c.image.startsWith('{{ include "team-ns.policy.otelAutoinstrumentationPrefix" . }}'))
{{- end -}}

{{/* CEL variable with all containers except the exempted images (see isExemptImage).
     Must be declared after allContainersVar. */}}
{{- define "team-ns.policy.checkedContainersVar" -}}
- name: checkedContainers
  expression: >-
    variables.allContainers.filter(c, !{{ include "team-ns.policy.isExemptImage" . }})
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
