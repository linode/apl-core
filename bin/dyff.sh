#!/bin/bash
set -ue

targetDirA=$1
targetDirB=$2

set +e
diff_output=$(diff -q -r $targetDirA $targetDirB)
set -e
# Process each line of diff output

echo "$diff_output" | while read -r line; do
  # Check if the line indicates a difference
  echo $line
  if [[ $line == *" and "* ]]; then
    # Extract the paths using cut
    first_path=$(echo $line | cut -d' ' -f2)
    second_path=$(echo $line | cut -d' ' -f4)

    # Use dyff to compare the files
    dyff between "$first_path" "$second_path" --omit-header \
      --exclude "data.tls.key" --exclude "/data/ca.crt" --exclude "/data/tls.crt" --exclude "/data/tls.key" \
      --exclude-regexp "/checksum" --exclude-regexp "/webhooks.*"
  fi
done
