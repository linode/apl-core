#!/usr/bin/env bash

. bin/common.sh
for_each_cluster "./bin/lint.sh"
