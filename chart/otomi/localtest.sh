# Usage:
# ENV_OUT=$PWD/../ENV_OUT VALUES_DIR=$PWD/../ chart/otomi/localtest.sh
# With VALUES_DIR holding a file named values.yaml holding the initial chart values
set -e

docker run --rm -it \
  --env-file=../.env \
  -e VERBOSITY=1 \
  -e OTOMI_VALUES_INPUT=/secret/values.yaml \
  -e OTOMI_NON_INTERACTIVE='true' \
  -w ${WORKDIR:-$PWD} \
  -e ENV_DIR=/home/app/stack/env \
  -v $ENV_OUT:/home/app/stack/env \
  -v $PWD:$PWD -v $VALUES_DIR:/secret \
  -v /tmp:/tmp $image \
  "binzx/otomi chart bootstrap && binzx/otomi chart merge && binzx/otomi chart push && binzx/otomi apply"
