#!/bin/bash
set -ue

# This script looks at dependecies that are defined in the chart/otomi-deps/Chart.yaml file and pulls latests official versions
cd chart/otomi-deps
helm dep update
