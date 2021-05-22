#!/usr/bin/env bash

# run from root

cd schemas/

export FILENAME_FORMAT='{kind}-{group}-{version}'

input_folder="input-crds"
gen_folder="generated-crd-schemas"

mkdir $gen_folder >/dev/null
rm -rf ./$gen_folder/*
mkdir $input_folder >/dev/null
rm -rf $input_folder/*

for pkg in "cert-manager" "istio" "knative"; do
  pkg_file="$input_folder/$pkg.yaml"
  echo '' >$pkg_file
  for crd in $(kubectl get crd | grep $pkg | awk '{print $1}'); do printf "$(kubectl get crd $crd -o yaml | yq d - 'metadata' | yq d - 'status')\n---\n" >>$pkg_file; done
  pushd $gen_folder
  ../crd2jsonschema.py ../input-crds/$pkg.yaml
  popd
done

cd $gen_folder && tar -zcvf ../$gen_folder.tar.gz .
rm -rf $input_folder $gen_folder
