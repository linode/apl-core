{{/*
Template for checking configuration

The messages templated here will be combined into a single `fail` call. This creates a means for the user to receive all messages at one time, instead of a frustrating iterative approach.

- `define` a new template, prefixed `gitlab.checkConfig.`
- Check for known problems in configuration, and directly output messages (see message format below)
- Add a line to `gitlab.checkConfig` to include the new template.

Message format:

**NOTE**: The `if` statement preceding the block should _not_ trim the following newline (`}}` not `-}}`), to ensure formatting during output.

```
chart:
    MESSAGE
```
*/}}
{{/*
Compile all warnings into a single message, and call fail.

Due to gotpl scoping, we can't make use of `range`, so we have to add action lines.
*/}}
{{- define "gitlab.checkConfig" -}}
{{- $messages := list -}}
{{/* add templates here */}}
{{- $messages := append $messages (include "gitlab.checkConfig.redis.both" .) -}}
{{- /* prepare output */}}
{{- $messages := without $messages "" -}}
{{- $message := join "\n" $messages -}}

{{- /* print output */}}
{{- if $message -}}
{{-   printf "\nCONFIGURATION CHECKS:\n%s" $message | fail -}}
{{- end -}}
{{- end -}}

{{/* Check configuration of Redis - can't have both redis & redis-ha */}}
{{- define "gitlab.checkConfig.redis.both" -}}
{{- if and .Values.redis.enabled (index .Values "redis-ha" "enabled") -}}
redis: both providers
    It appears that `redis.enabled` and `redis-ha.enabled` are both true.
    this will lead to undefined behavior. Please enable only one.
{{- end -}}
{{- end -}}
{{/* END gitlab.checkConfig.redis.both */}}
