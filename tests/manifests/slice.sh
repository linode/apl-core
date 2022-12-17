#!/usr/bin/env bash
# Based on https://github.com/helm/helm/issues/4680#issuecomment-613201032
#

set -eu

if [ -z "${1:-}" ]; then
  echo "Please provide an output directory"
  exit 1
fi

scriptDir="$(dirname -- "$0")"
manifestsPath="$scriptDir/all.yaml"
otomi template >"$manifestsPath"

awk -vout="$1" -F": " '
  $0~/^# Source: / {
    gsub("\r","",$2)
    file=out"/"$2;
    if (!(file in filemap)) {
      filemap[file] = 1
      print "Creating "file;
      system ("mkdir -p $(dirname "file")");
      print "---" >> file;
    }
  }
  $0!~/^# Source: / {
    if ($0!~/^---$/) {
      if (file) {
        print $0 >> file;
      }
    }
  }' <"$manifestsPath"
