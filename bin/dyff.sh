#!/bin/bash
set -ue

targetDirA=
targetDirB=
miscArgs=( --output github )

while [ $# -ne 0 ]
do
  case "$1" in
    --exclude-chart-versions)
      miscArgs=( "${miscArgs[@]}" --exclude-regexp '.*metadata.labels.helm.sh/chart' --exclude-regexp '.*metadata.labels.chart' --exclude-regexp '.*metadata.labels.app.kubernetes.io/version' )
      ;;
    *)
      if [ -z "$targetDirA" ]; then
        targetDirA=$1
      elif [ -z "$targetDirB" ]; then
        targetDirB=$1
      else
        echo "Extra argument $1"
        exit 1
      fi
      ;;
  esac
  shift
done
if [ -z "$targetDirA" ]; then
  echo "Missing first argument"
  exit 1
elif [ -z "$targetDirB" ]; then
  echo "Missing second argument"
  exit 1
fi

set +e
diff_output=$(diff -q -r "$targetDirA" "$targetDirB")
set -e
# Process each line of diff output

echo "$diff_output" | while read -r line; do
  # Check if the line indicates a difference
  if [[ $line == *" and "* ]]; then
    # Extract the paths using cut
    first_path=$(echo $line | cut -d' ' -f2)
    second_path=$(echo $line | cut -d' ' -f4)

    [ ! -f $second_path ] && echo "New file added: $first_path" && continue
    [ ! -f $first_path ] && echo "Old file deleted: $second_path" && continue

    # Use dyff to compare the files
    dyff between "$second_path" "$first_path" --omit-header \
      --exclude "data.tls.key" --exclude "/data/ca.crt" --exclude "/data/tls.crt" --exclude "/data/tls.key" \
      --exclude-regexp "/checksum" --exclude-regexp "/webhooks.*" --ignore-order-changes "${miscArgs[@]}"
  fi
done
