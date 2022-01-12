set -e

export VALUES_INPUT=${VALUES_INPUT:-'/tmp/otomi/values.yaml'}
export CI=1
export VERBOSITY=${VERBOSITY:-'1'}

binzx/otomi bootstrap
