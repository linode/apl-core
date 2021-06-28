. /home/app/stack/env/sops-creds.env
# exception for google:
[ -n "$GCLOUD_SERVICE_KEY" ] && echo $GCLOUD_SERVICE_KEY >/tmp/gcloud_service_key && export GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcloud_service_key
echo expoDeploying otomi...
bin/deploy.sh
