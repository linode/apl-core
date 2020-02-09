# /bin/bash

tpl="$PWD/.drone.yaml"

cd .env >/dev/null
for c in */; do
  CLOUD=$(echo $c | sed -e 's/\///g')
  cd $CLOUD >/dev/null
  for c in *.sh; do
    CLUSTER=$(echo $c | sed -e 's/\.sh//g')
    echo "creating .env/$CLOUD/$CLUSTER/.drone.yml"
    cat $tpl | sed -e "s/CCCLOUD/${CLOUD}/g" -e "s/CCCLUSTER/${CLUSTER}/g" >.drone.yml
  done
  cd - >/dev/null
done
cd - >/dev/null
