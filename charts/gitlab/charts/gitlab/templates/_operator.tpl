{{/*
Return the version used of Gitlab
Defaults to using the information from the chart appVersion field, but can be
overridden using the global.gitlabVersion field in values.
*/}}
{{- define "gitlab.operator.gitlabVersion" -}}
{{- template "gitlab.parseAppVersion" (coalesce .Values.global.gitlabVersion .Chart.AppVersion) -}}
{{- end -}}

{{/*
Returns a image tag from the passed in version

If the version is 'master' we use the 'latest' image tag.
Else if the version is a 'x.x' version, we use the 'vx.x.x' image tag
Else we just use the version passed as the image tag
*/}}
{{- define "gitlab.operator.parseVersion" -}}
{{- $version := (coalesce . "master") | toString -}}
{{- if eq $version "master" -}}
latest
{{- else if regexMatch "^\\d+\\.\\d+$" $version -}}
{{- printf "v%s" $version -}}
{{- else -}}
{{- $version -}}
{{- end -}}
{{- end -}}

{{/*
Returns true if and only if the version of the operator container is greater
than 0.4.
*/}}
{{- define "gitlab.operator.namespaced" -}}
{{-   $version := (include "gitlab.operator.parseVersion" .Values.version) -}}
{{-   if and (regexMatch "^v\\d+\\.\\d+$" $version) (le ($version | trimPrefix "v" | float64) 0.4) -}}
{{- /* this is the false condition */ -}}
{{-   else -}}
true
{{-   end -}}
{{- end -}}

{{/*
Returns the operator crd name which should be in the format of spec.names.plural + '.' + groupname
*/}}

{{- define "gitlab.operator.crdName" -}}
{{- $groupName := include "gitlab.operator.groupName" . -}}
{{ printf "gitlabs.%s" $groupName}}
{{- end -}}

{{/*
Returns the operator group name. A subgroup with the release name is chosen
*/}}

{{- define "gitlab.operator.groupName" -}}
{{- if .Values.crdPrefix -}}
{{ printf "%s.gitlab.com" .Values.crdPrefix }}
{{- else -}}
gitlab.com
{{- end -}}
{{- end -}}
