. /env/sops-creds.env
. bin/common.sh
VERBOSE=1
# exception for google:
[ -n "$GCLOUD_SERVICE_KEY" ] && echo $GCLOUD_SERVICE_KEY >/tmp/gcloud_service_key && export GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcloud_service_key
crypt enc
