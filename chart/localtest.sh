function run_core() {
  image=$1
  shift
  docker run --rm -it -e VERBOSE=1 -e ENV_DIR=/env -e IN_DOCKER=1 -e CI=1 -w $PWD -v /Users/mojtaba/opt/bs3:/env -v $PWD:$PWD -v /Users/mojtaba/opt/otomi-chart:/secret -v /tmp:/tmp $image "$@"
}

function run_task() {
  docker run --rm -it -e ENV_DIR=/env -e IN_DOCKER=1 -e CI=1 -e OTOMI_VALUES_INPUT=/secret/values.yaml -e OTOMI_SCHEMA_PATH=/env/values-schema.yaml -e OTOMI_ENV_DIR=/env -v /Users/mojtaba/opt/bs3:/env -v /Users/mojtaba/opt/otomi-chart:/secret -v /tmp:/tmp otomi/tasks:otomi-chart "$@"
}

run_core otomi/core:otomi-install-chart bash -c "$(cat chart/scripts/bootstrap-values.sh)"
run_task sh -c "$(cat chart/scripts/map-values.sh)"
run_core otomi/core:otomi-install-chart bash -c "$(cat chart/scripts/encrypt-values.sh)"
run_core otomi/core:otomi-install-chart bash -c "$(cat chart/scripts/deploy.sh)"
