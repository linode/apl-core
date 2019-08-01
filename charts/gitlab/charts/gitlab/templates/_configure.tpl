{{/*
  Include using:
  {{ include "gitlab.scripts.configure" (
            dict
                "required" "your required secrets dirs" // optional, default "redis shell gitaly registry postgres rails-secrets gitlab-workhorse"
                "optional" "your optional secrets dirs" // optional, default "minio objectstorage ldap omniauth smtp"
    ) }}
*/}}
{{- define "gitlab.scripts.configure.secrets" -}}
set -e
config_dir="/init-config"
secret_dir="/init-secrets"

for secret in {{ default "shell gitaly registry postgres rails-secrets gitlab-workhorse" $.required }} ; do
  mkdir -p "${secret_dir}/${secret}"
  cp -v -r -L "${config_dir}/${secret}/." "${secret_dir}/${secret}/"
done
for secret in {{ default "redis minio objectstorage ldap omniauth smtp" $.optional }} ; do
  if [ -e "${config_dir}/${secret}" ]; then
    mkdir -p "${secret_dir}/${secret}"
    cp -v -r -L "${config_dir}/${secret}/." "${secret_dir}/${secret}/"
  fi
done
{{ end -}}
