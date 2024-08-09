# Overview

This a dummy chart that keeps dependecies in the Chart.yaml file.
The charts directory is a symbolic link, so helm command do not complain about the missing dependecies. It is also useful because `helm dep update` command will pull archives to the charts directory.

# Updating the dependecies
* The renovate plugin watches the `chart/otomi-deps/Chart.yaml` and updates versions on a regular bases
* Next developer runs `npm run charts-update` to pull all dependecies. Developer unpacks them in to corresponding directory in the charts directory