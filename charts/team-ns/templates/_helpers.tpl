{{- define "raw.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "chart-labels" -}}
app: {{ template "raw.name" . }}
app.kubernetes.io/name: {{ template "raw.name" . }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
app.kubernetes.io/version: {{ .Chart.Version }}
app.kubernetes.io/part-of: otomi
helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
{{- end -}}

{{- define "helm-toolkit.utils.joinListWithSep" -}}
{{- $local := dict "first" true -}}
{{- $ := . -}}
{{- range $k, $v := .list -}}{{- if not $local.first -}}{{ $.sep }}{{- end -}}{{- $v -}}{{- $_ := set $local "first" false -}}{{- end -}}
{{- end -}}

{{- define "flatten-name" -}}
{{- $res := regexReplaceAll "[()/_]{1}" . "" -}}
{{- regexReplaceAll "[|.]{1}" $res "-" | trimAll "-" -}}
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

{{- define "common.capabilities.kubeVersion" -}}
{{- default .Capabilities.KubeVersion.Version .Values.kubeVersionOverride -}}
{{- end -}}

{{- define "service.domain" -}}
{{- $v := .dot.Values }}
{{- $isApps := and .s.isCore (not (or .s.ownHost .s.isShared)) }}
{{- if and $isApps (not .vs) }}
{{- printf "apps.%s" $v.domain -}}
{{- else -}}
{{- $svc := (hasKey .s "hasPrefix" | ternary (printf "%s-%s" $v.teamId (.s.svc | default .s.name)) (.s.svc | default .s.name)) -}}
{{- $shared := (and .s.isCore (eq $v.teamId "admin") (hasKey .s "isShared")) | default false -}}
{{- $domain := (index .s "domain" | default (printf "%s.%s" .s.name ($shared | ternary $v.cluster.domainSuffix $v.domain))) -}}
{{- print $domain -}}
{{- end -}}
{{- end -}}