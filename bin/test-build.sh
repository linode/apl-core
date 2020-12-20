#!/usr/bin/env bash
export CI=true

bin/validate-values.sh &&
  bats bin/tests &&
  bin/validate-templates.sh &&
  bin/validate-policies.sh
