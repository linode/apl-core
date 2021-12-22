set -e

export VALUES_INPUT=/tmp/otomi/values.yaml
export CI=1
export VERBOSITY=1
# export GCLOUD_SERVICE_KEY=

binzx/otomi bootstrap
# binzx/otomi apply
# binzx/otomi commit
