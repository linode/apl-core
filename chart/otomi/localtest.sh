set -e

export VALUES_INPUT=${VALUES_INPUT:-'/tmp/otomi/values.yaml'}
export DOCKER_EXTRA_ARGS="-v $(dirname $VALUES_INPUT):$(dirname $VALUES_INPUT)"
export VERBOSITY=${VERBOSITY:-'1'}

binzx/otomi bootstrap -tv
binzx/otomi apply -v
