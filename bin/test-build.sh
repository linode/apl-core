#!/usr/bin/env bash
export CI='true'

bin/validate-values.sh &&
  bin/otomi bats &&
  bin/validate-templates.sh &&
  bin/check-policies.sh
