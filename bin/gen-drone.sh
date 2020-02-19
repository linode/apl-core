# /bin/bash
export ENV_DIR=${ENV_DIR:-$PWD/env}

tpl="$ENV_DIR/.drone.tpl.yaml"

cd $ENV_DIR >/dev/null
for c in */; do
  CLOUD=$(echo $c | sed -e 's/\///g')
  cd $CLOUD >/dev/null
  for c in *.sh; do
    CLUSTER=$(echo $c | sed -e 's/\.sh//g')
    echo "creating $ENV_DIR/$CLOUD/$CLUSTER/.drone.yml"
    cat $tpl | sed -e "s/CCCLOUD/${CLOUD}/g" -e "s/CCCLUSTER/${CLUSTER}/g" >.drone.yml
  done
  cd - >/dev/null
done
cd - >/dev/null
