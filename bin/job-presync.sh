#!/usr/bin/env bash

# hook, so go back one level first
cd ..

. bin/common.sh

release=$1
run_policy=${2:-'OnSpecChange'}

is_deployed=false
hf list | grep $release && is_deployed=true

[ -n "$VERBOSE" ] && echo "Release: $release, run_policy: $run_policy, deployed: $is_deployed"
! $is_deployed && exit

# what to do:
# - OnSpecChange: if diff remove old job
# - Always: remove job

if [ "$run_policy" = 'Always' ]; then
  hf -l name=$release destroy
else
  # OnSpecChange
  has_diff=false
  hf -l name=$release diff --skip-deps && has_diff=true
  [ -n "$VERBOSE" ] && echo "has_diff: $has_diff"
  if $has_diff && $is_deployed; then
    hf -l name=$release destroy
  fi
fi
