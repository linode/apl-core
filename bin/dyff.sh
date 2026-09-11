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

targetDirA=${targetDirA%/}
targetDirB=${targetDirB%/}

to_relative_path() {
  local full_path=$1
  local base_path=$2
  local rel

  if [[ "$full_path" == "$base_path" ]]; then
    printf '%s' "."
    return
  elif [[ "$full_path" == "$base_path/"* ]]; then
    rel="${full_path#"$base_path/"}"
  else
    rel="$full_path"
  fi

  # Strip the first directory component
  printf '%s' "${rel#*/}"
}

join_relative_path() {
  local dir_path=$1
  local file_name=$2

  if [[ "$dir_path" == "." ]]; then
    printf '%s' "$file_name"
  else
    printf '%s' "$dir_path/$file_name"
  fi
}

print_comment() {
  echo "# $*"
}

set +e
diff_output=$(diff -q -r "$targetDirA" "$targetDirB")
set -e
# Process each line of diff output.
echo "$diff_output" | while read -r line; do
  # diff -q -r emits: "Files <pathA> and <pathB> differ"
  if [[ $line =~ ^Files[[:space:]]+(.+)[[:space:]]+and[[:space:]]+(.+)[[:space:]]+differ$ ]]; then
    # Capture regex groups from the above regex pattern to get the full paths of the differing files
    first_path="${BASH_REMATCH[1]}"
    second_path="${BASH_REMATCH[2]}"
    relative_first_path=$(to_relative_path "$first_path" "$targetDirA")
    relative_second_path=$(to_relative_path "$second_path" "$targetDirB")

    [ ! -f "$second_path" ] && print_comment "New file added: $relative_first_path" && continue
    [ ! -f "$first_path" ] && print_comment "Old file deleted: $relative_second_path" && continue

    print_comment "$relative_first_path"

    dyff between "$second_path" "$first_path" --omit-header \
      --exclude "data.tls.key" --exclude "/data/ca.crt" --exclude "/data/tls.crt" --exclude "/data/tls.key" \
      --exclude-regexp "/checksum" --exclude-regexp "/webhooks.*" --ignore-order-changes "${miscArgs[@]}"
  elif [[ $line =~ ^Only[[:space:]]+in[[:space:]]+(.+):[[:space:]]+(.+)$ ]]; then
    only_in_dir="${BASH_REMATCH[1]}"
    only_in_file="${BASH_REMATCH[2]}"
    full_path="$only_in_dir/$only_in_file"
    
    if [[ "$only_in_dir" == "$targetDirA"* ]]; then
      file_path=$(join_relative_path "$(to_relative_path "$only_in_dir" "$targetDirA")" "$only_in_file")
      if [[ -d "$full_path" ]]; then
        print_comment "New directory added: $file_path"
        # Recursively show all files in the new directory
        find "$full_path" -type f | sort | while read -r new_file; do
          rel_file=$(to_relative_path "$new_file" "$targetDirA")
          print_comment "  New file: $rel_file"
          dyff between /dev/null "$new_file" --omit-header \
            --exclude "data.tls.key" --exclude "/data/ca.crt" --exclude "/data/tls.crt" --exclude "/data/tls.key" \
            --exclude-regexp "/checksum" --exclude-regexp "/webhooks.*" --ignore-order-changes "${miscArgs[@]}" || true
        done
      else
        print_comment "New file added: $file_path"
        # Show the contents of the new file
        dyff between /dev/null "$full_path" --omit-header \
          --exclude "data.tls.key" --exclude "/data/ca.crt" --exclude "/data/tls.crt" --exclude "/data/tls.key" \
          --exclude-regexp "/checksum" --exclude-regexp "/webhooks.*" --ignore-order-changes "${miscArgs[@]}" || true
      fi
    elif [[ "$only_in_dir" == "$targetDirB"* ]]; then
      file_path=$(join_relative_path "$(to_relative_path "$only_in_dir" "$targetDirB")" "$only_in_file")
      if [[ -d "$full_path" ]]; then
        print_comment "Old directory deleted: $file_path"
        # Recursively show all files in the deleted directory
        find "$full_path" -type f | sort | while read -r old_file; do
          rel_file=$(to_relative_path "$old_file" "$targetDirB")
          print_comment "  Old file: $rel_file"
          dyff between "$old_file" /dev/null --omit-header \
            --exclude "data.tls.key" --exclude "/data/ca.crt" --exclude "/data/tls.crt" --exclude "/data/tls.key" \
            --exclude-regexp "/checksum" --exclude-regexp "/webhooks.*" --ignore-order-changes "${miscArgs[@]}" || true
        done
      else
        print_comment "Old file deleted: $file_path"
        # Show the contents of the deleted file
        dyff between "$full_path" /dev/null --omit-header \
          --exclude "data.tls.key" --exclude "/data/ca.crt" --exclude "/data/tls.crt" --exclude "/data/tls.key" \
          --exclude-regexp "/checksum" --exclude-regexp "/webhooks.*" --ignore-order-changes "${miscArgs[@]}" || true
      fi
    else
      print_comment "$line"
    fi
  fi
done
