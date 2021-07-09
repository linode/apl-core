# Usage:
# ENV_OUT=$PWD/../ENV_OUT VALUES_DIR=$PWD/../ chart/otomi/localtest.sh
# With VALUES_DIR holding a file named values.yaml holding the initial chart values

function run_core() {
  image=$1
  shift
  docker run --rm -it --env-file=chart/otomi/.env -e VERBOSE=1 -e IN_DOCKER=1 -e CI=1 -e OTOMI_VERSION=$OTOMI_VERSION -e OTOMI_VALUES_INPUT=/secret/values.yaml -w ${WORKDIR:-$PWD} -e ENV_DIR=/home/app/stack/env -v $ENV_OUT:/home/app/stack/env -v $PWD:$PWD -v $VALUES_DIR:/secret -v /tmp:/tmp $image "$@"
}

function run_task() {
  docker run --rm -it -e OTOMI_ENV_DIR=/env -e IN_DOCKER=1 -e CI=1 -e OTOMI_VALUES_INPUT=/secret/values.yaml -e OTOMI_SCHEMA_PATH=/env/values-schema.yaml -v $ENV_OUT:/env -v $VALUES_DIR:/secret -v /tmp:/tmp otomi/tasks:master "$@"
}

coreTag=chart-schema

run_core otomi/core:$coreTag bash -c "$(cat chart/otomi/scripts/bootstrap-values.sh)"

echo ------ mapping values ------
run_task sh -c "npm run tasks:otomi-chart"

echo ------ push values ------
run_core otomi/core:$coreTag bash -c "$(cat chart/otomi/scripts/push-values.sh)"

echo ------ deploying ------
WORKDIR=/home/app/stack run_core otomi/core:$coreTag bash -c 'bin/deploy.sh'
