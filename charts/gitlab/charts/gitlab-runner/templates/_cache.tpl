{{- define "gitlab-runner.cache" }}
{{-   if .Values.runners.cache.cacheType }}
- name: CACHE_TYPE
  value: {{ default "" .Values.runners.cache.cacheType | quote }}
- name: CACHE_PATH
  value: {{ coalesce .Values.runners.cache.cachePath .Values.runners.cache.s3CachePath | default "" | quote }}
{{-     if .Values.runners.cache.cacheShared }}
- name: CACHE_SHARED
  value: "true"
{{-     end }}
{{-     if eq .Values.runners.cache.cacheType "s3" }}
- name: CACHE_S3_SERVER_ADDRESS
  value: {{ include "gitlab-runner.cache.s3ServerAddress" . }}
- name: CACHE_S3_BUCKET_NAME
  value: {{ default "" .Values.runners.cache.s3BucketName | quote }}
- name: CACHE_S3_BUCKET_LOCATION
  value: {{ default "" .Values.runners.cache.s3BucketLocation | quote }}
{{-       if .Values.runners.cache.s3CacheInsecure }}
- name: CACHE_S3_INSECURE
  value: "true"
{{-       end }}
{{-     end }}
{{-     if eq .Values.runners.cache.cacheType "gcs" }}
- name: CACHE_GCS_BUCKET_NAME
  value: {{ default "" .Values.runners.cache.gcsBucketName | quote }}
{{-     end }}
{{-   end }}
{{- end -}}
