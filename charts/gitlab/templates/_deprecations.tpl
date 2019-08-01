{{/*
Template for handling deprecation messages

The messages templated here will be combined into a single `fail` call. This creates a means for the user to receive all messages at one time, in place a frustrating iterative approach.

- `define` a new template, prefixed `gitlab.deprecate.`
- Check for deprecated values / patterns, and directly output messages (see message format below)
- Add a line to `gitlab.deprecations` to include the new template.

Message format:

**NOTE**: The `if` statement preceding the block should _not_ trim the following newline (`}}` not `-}}`), to ensure formatting during output.

```
chart:
    MESSAGE
```
*/}}
{{/*
Compile all deprecations into a single message, and call fail.

Due to gotpl scoping, we can't make use of `range`, so we have to add action lines.
*/}}
{{- define "gitlab.deprecations" -}}
{{- $deprecated := list -}}
{{/* add templates here */}}
{{- $deprecated := append $deprecated (include "gitlab.deprecate.rails.appConfig" .) -}}
{{- $deprecated := append $deprecated (include "gitlab.deprecate.minio" .) -}}
{{- $deprecated := append $deprecated (include "gitlab.deprecate.registryStorage" .) -}}
{{- $deprecated := append $deprecated (include "gitlab.deprecate.registryHttpSecret" .) -}}
{{- $deprecated := append $deprecated (include "gitlab.deprecate.unicorn.omniauth" .) -}}
{{- $deprecated := append $deprecated (include "gitlab.deprecate.unicorn.ldap" .) -}}
{{- $deprecated := append $deprecated (include "gitlab.deprecate.global.appConfig.ldap.password" .) -}}
{{- $deprecated := append $deprecated (include "gitlab.deprecate.sidekiq.cronJobs" .) -}}

{{- /* prepare output */}}
{{- $deprecated := without $deprecated "" -}}
{{- $message := join "\n" $deprecated -}}

{{- /* print output */}}
{{- if $message -}}
{{-   printf "\nDEPRECATIONS:\n%s" $message | fail -}}
{{- end -}}
{{- end -}}

{{/* Migration of rails shared lfs/artifacts/uploads blocks to globals */}}
{{- define "gitlab.deprecate.rails.appConfig" -}}
{{- range $chart := list "unicorn" "sidekiq" "task-runner" -}}
{{-   if index $.Values.gitlab $chart -}}
{{-     range $i, $block := list "lfs" "artifacts" "uploads" -}}
{{-       if hasKey (index $.Values.gitlab $chart) $block }}
{{-         with $config := index $.Values.gitlab $chart $block -}}
{{-           range $item := list "enabled" "bucket" "proxy_download" -}}
{{-             if hasKey $config $item }}
gitlab.{{ $chart }}:
    `{{ $block }}.{{ $item }}` has been moved to global. Please remove `{{ $block }}.{{ $item }}` from your properties, and set `global.appConfig.{{ $block }}.{{ $item }}`
{{-             end -}}
{{-           end -}}
{{-           if .connection -}}
{{-             if without (keys .connection) "secret" "key" | len | ne 0 }}
gitlab.{{ $chart }}:
    The `{{ $block }}.connection` declarations have been moved into a secret. Please create a secret with these contents, and set `global.appConfig.{{ $block }}.connection.secret`
{{-             end -}}
{{-           end -}}
{{-         end -}}
{{-       end -}}
{{-     end -}}
{{-   end -}}
{{- end -}}
{{- end -}}

{{/* Deprecation behaviors for global configuration of Minio */}}
{{- define "gitlab.deprecate.minio" -}}
{{- if ( hasKey .Values.minio "enabled" ) }}
minio:
    Chart-local `enabled` property has been moved to global. Please remove `minio.enabled` from your properties, and set `global.minio.enabled` instead.
{{- end -}}
{{- if .Values.registry.minio -}}
{{-   if ( hasKey .Values.registry.minio "enabled" ) }}
registry:
    Chart-local configuration of Minio features has been moved to global. Please remove `registry.minio.enabled` from your properties, and set `global.minio.enabled` instead.
{{-   end -}}
{{- end -}}
{{- if .Values.gitlab.unicorn.minio -}}
{{-   if ( hasKey .Values.gitlab.unicorn.minio "enabled" ) }}
gitlab.unicorn:
    Chart-local configuration of Minio features has been moved to global. Please remove `gitlab.unicorn.minio.enabled` from your properties, and set `global.minio.enabled` instead.
{{-   end -}}
{{- end -}}
{{- if .Values.gitlab.sidekiq.minio -}}
{{-   if ( hasKey .Values.gitlab.sidekiq.minio "enabled" ) }}
gitlab.sidekiq:
    Chart-local configuration of Minio features has been moved to global. Please remove `gitlab.sidekiq.minio.enabled` from your properties, and set `global.minio.enabled` instead.
{{-   end -}}
{{- end -}}
{{- if index .Values.gitlab "task-runner" "minio" -}}
{{-   if ( hasKey ( index .Values.gitlab "task-runner" "minio" ) "enabled" ) }}
gitlab.task-runner:
    Chart-local configuration of Minio features has been moved to global. Please remove `gitlab.task-runner.minio.enabled` from your properties, and set `global.minio.enabled` instead.
{{-   end -}}
{{- end -}}
{{- end -}}
{{/* END deprecate.minio */}}

{{/* Migration of Registry `storage` dict to a secret */}}
{{- define "gitlab.deprecate.registryStorage" -}}
{{- if .Values.registry.storage -}}
{{-   $keys := without (keys .Values.registry.storage) "secret" "key" "extraKey" -}}
{{-   if len $keys | ne 0 }}
registry:
    The `storage` property has been moved into a secret. Please create a secret with these contents, and set `storage.secret`.
{{-   end -}}
{{- end -}}
{{- end -}}

{{/* Migration of Registry `httpSecret` property to secret */}}
{{- define "gitlab.deprecate.registryHttpSecret" -}}
{{- if .Values.registry.httpSecret -}}
registry:
    The `httpSecret` property has been moved into a secret. Please create a secret with these contents, and set `global.registry.httpSecret.secret` and `global.registry.httpSecret.key`.
{{- end -}}
{{- end -}}

{{/* Deprecation behaviors for configuration of Omniauth */}}
{{- define "gitlab.deprecate.unicorn.omniauth" -}}
{{- if hasKey .Values.gitlab.unicorn "omniauth" -}}
unicorn:
    Chart-local configuration of Omniauth has been moved to global. Please remove `unicorn.omniauth.*` settings from your properties, and set `global.appConfig.omniauth.*` instead.
{{- end -}}
{{- end -}}
{{/* END deprecate.unicorn.omniauth */}}

{{/* Deprecation behaviors for configuration of LDAP */}}
{{- define "gitlab.deprecate.unicorn.ldap" -}}
{{- if hasKey .Values.gitlab.unicorn "ldap" -}}
unicorn:
    Chart-local configuration of LDAP has been moved to global. Please remove `unicorn.ldap.*` settings from your properties, and set `global.appConfig.ldap.*` instead.
{{- end -}}
{{- end -}}
{{/* END deprecate.unicorn.ldap */}}

{{- define "gitlab.deprecate.global.appConfig.ldap.password" -}}
{{- if .Values.global.appConfig.ldap.servers -}}
{{-   $hasPlaintextPassword := dict -}}
{{-   range $name, $config := .Values.global.appConfig.ldap.servers -}}
{{-     if and (hasKey $config "password") (kindIs "string" $config.password) -}}
{{-       $_ := set $hasPlaintextPassword "true" "true" -}}
{{-     end -}}
{{-   end -}}
{{-   if hasKey $hasPlaintextPassword "true" -}}
global.appConfig.ldap:
     Plain-text configuration of LDAP passwords has been deprecated in favor of secret configuration. Please create a secret containing the password, and set `password.secret` and `password.key`.
{{-   end -}}
{{- end -}}
{{- end -}}{{/* "gitlab.deprecate.global.appConfig.ldap.password" */}}

{{/* Deprecation behaviors for configuration of cron jobs */}}
{{- define "gitlab.deprecate.sidekiq.cronJobs" -}}
{{- if hasKey .Values.gitlab.sidekiq "cron_jobs" -}}
sidekiq:
    Chart-local configuration of cron jobs has been moved to global. Please remove `sidekiq.cron_jobs.*` settings from your properties, and set `global.appConfig.cron_jobs.*` instead.
{{- end -}}
{{- end -}}
{{/* END deprecate.sidekiq.cronJobs */}}
