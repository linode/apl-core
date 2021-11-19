set -e

export VALUES_INPUT=${VALUES_INPUT:-tmp/otomi/values.yaml}
export ENV_DIR=${ENV_DIR:-/tmp/otomi/values}
export CI=1
export VERBOSITY=2
# export GCLOUD_SERVICE_KEY=

binzx/otomi bootstrap
# binzx/otomi apply
# binzx/otomi commit
