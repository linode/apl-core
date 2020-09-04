#!/usr/bin/env bash

. ./bin/load_kube_validation.sh && ( (validate 1.17.0) && echo Success) || echo Failed
