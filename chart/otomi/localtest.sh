# Usage:
# ENV_OUT=$PWD/../ENV_OUT VALUES_DIR=$PWD/../ chart/localtest.sh
# With VALUES_DIR holding a file named values.yaml holding the initial chart values

function run_core() {
  image=$1
  shift
  docker run --rm -it --env-file=$PWD/../.env -e VERBOSE=1 -e ENV_DIR=/env -e IN_DOCKER=1 -e CI=1 -e OTOMI_VALUES_INPUT=/secret/values.yaml -w $PWD -v $ENV_OUT:/env -v $PWD:$PWD -v $VALUES_DIR:/secret -v /tmp:/tmp $image "$@"
}

function run_task() {
  docker run --rm -it -e OTOMI_ENV_DIR=/env -e IN_DOCKER=1 -e CI=1 -e OTOMI_VALUES_INPUT=/secret/values.yaml -e OTOMI_SCHEMA_PATH=/env/values-schema.yaml -v $ENV_OUT:/env -v $VALUES_DIR:/secret -v /tmp:/tmp otomi/tasks:otomi-chart "$@"
}

run_core otomi/core:master bash -c "$(cat chart/scripts/bootstrap-values.sh)"
run_task sh -c "$(cat chart/scripts/map-values.sh)"
run_core otomi/core:master bash -c "$(cat chart/scripts/encrypt-values.sh)"
run_core otomi/core:master bash -c "$(cat chart/scripts/deploy.sh)"
