{{/* vim: set filetype=mustache: */}}

{{/*
Return the proper Redis image name
*/}}
{{- define "redis.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper Redis Sentinel image name
*/}}
{{- define "redis.sentinel.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.sentinel.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper image name (for the metrics image)
*/}}
{{- define "redis.metrics.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.metrics.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper image name (for the metrics image)
*/}}
{{- define "redis.metrics.sentinel.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.metrics.sentinel.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper image name (for the init container volume-permissions image)
*/}}
{{- define "redis.volumePermissions.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.volumePermissions.image "global" .Values.global) }}
{{- end -}}

{{/*
Return sysctl image
*/}}
{{- define "redis.sysctl.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.sysctl.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "redis.imagePullSecrets" -}}
{{- include "common.images.pullSecrets" (dict "images" (list .Values.image .Values.sentinel.image .Values.metrics.image .Values.metrics.sentinel.image .Values.volumePermissions.image .Values.sysctl.image) "global" .Values.global) -}}
{{- end -}}

{{/*
Return the appropriate apiVersion for networkpolicy.
*/}}
{{- define "networkPolicy.apiVersion" -}}
{{- if semverCompare ">=1.4-0, <1.7-0" .Capabilities.KubeVersion.GitVersion -}}
{{- print "extensions/v1beta1" -}}
{{- else -}}
{{- print "networking.k8s.io/v1" -}}
{{- end -}}
{{- end -}}

{{/*
Return the appropriate apiGroup for PodSecurityPolicy.
*/}}
{{- define "podSecurityPolicy.apiGroup" -}}
{{- if semverCompare ">=1.14-0" .Capabilities.KubeVersion.GitVersion -}}
{{- print "policy" -}}
{{- else -}}
{{- print "extensions" -}}
{{- end -}}
{{- end -}}

{{/*
Return the appropriate apiVersion for PodSecurityPolicy.
*/}}
{{- define "podSecurityPolicy.apiVersion" -}}
{{- if semverCompare ">=1.14-0" .Capabilities.KubeVersion.GitVersion -}}
{{- print "policy/v1beta1" -}}
{{- else -}}
{{- print "extensions/v1beta1" -}}
{{- end -}}
{{- end -}}

{{/*
Return the path to the cert file.
*/}}
{{- define "redis.tlsCert" -}}
{{- required "Certificate filename is required when TLS in enabled" .Values.tls.certFilename | printf "/opt/bitnami/redis/certs/%s" -}}
{{- end -}}

{{/*
Return the path to the cert key file.
*/}}
{{- define "redis.tlsCertKey" -}}
{{- required "Certificate Key filename is required when TLS in enabled" .Values.tls.certKeyFilename | printf "/opt/bitnami/redis/certs/%s" -}}
{{- end -}}

{{/*
Return the path to the CA cert file.
*/}}
{{- define "redis.tlsCACert" -}}
{{- required "Certificate CA filename is required when TLS in enabled" .Values.tls.certCAFilename | printf "/opt/bitnami/redis/certs/%s" -}}
{{- end -}}

{{/*
Return the path to the DH params file.
*/}}
{{- define "redis.tlsDHParams" -}}
{{- if .Values.tls.dhParamsFilename -}}
{{- printf "/opt/bitnami/redis/certs/%s" .Values.tls.dhParamsFilename -}}
{{- end -}}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "redis.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "common.names.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Return the configuration configmap name
*/}}
{{- define "redis.configmapName" -}}
{{- if .Values.existingConfigmap -}}
    {{- printf "%s" (tpl .Values.existingConfigmap $) -}}
{{- else -}}
    {{- printf "%s-configuration" (include "common.names.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Return true if a configmap object should be created
*/}}
{{- define "redis.createConfigmap" -}}
{{- if empty .Values.existingConfigmap }}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Get the password secret.
*/}}
{{- define "redis.secretName" -}}
{{- if .Values.auth.existingSecret -}}
{{- printf "%s" .Values.auth.existingSecret -}}
{{- else -}}
{{- printf "%s" (include "common.names.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Get the password key to be retrieved from Redis(TM) secret.
*/}}
{{- define "redis.secretPasswordKey" -}}
{{- if and .Values.auth.existingSecret .Values.auth.existingSecretPasswordKey -}}
{{- printf "%s" .Values.auth.existingSecretPasswordKey -}}
{{- else -}}
{{- printf "redis-password" -}}
{{- end -}}
{{- end -}}

{{/*
Return Redis(TM) password
*/}}
{{- define "redis.password" -}}
{{- if not (empty .Values.global.redis.password) }}
    {{- .Values.global.redis.password -}}
{{- else if not (empty .Values.auth.password) -}}
    {{- .Values.auth.password -}}
{{- else -}}
    {{- randAlphaNum 10 -}}
{{- end -}}
{{- end -}}

{{/* Check if there are rolling tags in the images */}}
{{- define "redis.checkRollingTags" -}}
{{- include "common.warnings.rollingTag" .Values.image }}
{{- include "common.warnings.rollingTag" .Values.sentinel.image }}
{{- include "common.warnings.rollingTag" .Values.metrics.image }}
{{- end -}}

{{/*
Compile all warnings into a single message, and call fail.
*/}}
{{- define "redis.validateValues" -}}
{{- $messages := list -}}
{{- $messages := append $messages (include "redis.validateValues.spreadConstraints" .) -}}
{{- $messages := append $messages (include "redis.validateValues.architecture" .) -}}
{{- $messages := without $messages "" -}}
{{- $message := join "\n" $messages -}}

{{- if $message -}}
{{-   printf "\nVALUES VALIDATION:\n%s" $message | fail -}}
{{- end -}}
{{- end -}}

{{/* Validate values of Redis(TM) - spreadConstrainsts K8s version */}}
{{- define "redis.validateValues.spreadConstraints" -}}
{{- if and (semverCompare "<1.16-0" .Capabilities.KubeVersion.GitVersion) .Values.replica.spreadConstraints -}}
redis: spreadConstraints
    Pod Topology Spread Constraints are only available on K8s  >= 1.16
    Find more information at https://kubernetes.io/docs/concepts/workloads/pods/pod-topology-spread-constraints/
{{- end -}}
{{- end -}}

{{/* Validate values of Redis(TM) - must provide a valid architecture */}}
{{- define "redis.validateValues.architecture" -}}
{{- if and (ne .Values.architecture "standalone") (ne .Values.architecture "replication") -}}
redis: architecture
    Invalid architecture selected. Valid values are "standalone" and
    "replication". Please set a valid architecture (--set architecture="xxxx")
{{- end -}}
{{- if and .Values.sentinel.enabled (not (eq .Values.architecture "replication")) }}
redis: architecture
    Using redis sentinel on standalone mode is not supported.
    To deploy redis sentinel, please select the "replication" mode
    (--set "architecture=replication,sentinel.enabled=true")
{{- end -}}
{{- end -}}
