#!/usr/bin/env bash

. ./bin/load_kube_validation.sh && ( (validate 1.15.0) && echo Success) || echo Failed
