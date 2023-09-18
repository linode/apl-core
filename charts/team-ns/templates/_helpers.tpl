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

{{- define "common.capabilities.kubeVersion" -}}
{{- default .Capabilities.KubeVersion.Version .Values.kubeVersionOverride -}}
{{- end -}}

{{- define "service.domain" -}}
{{- $v := .dot.Values }}
{{- $svc := (hasKey .s "hasPrefix" | ternary (printf "%s-%s" $v.teamId (.s.svc | default .s.name)) (.s.svc | default .s.name)) -}}
{{- $shared := (and .s.isCore (eq $v.teamId "admin") (hasKey .s "isShared")) | default false -}}
{{- $host := ($shared | ternary .s.name (printf "%s-%s" .s.name $v.teamId )) -}}
{{- $domain := (index .s "domain" | default (printf "%s.%s" $host $v.domain)) -}}
{{- print $domain -}}
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