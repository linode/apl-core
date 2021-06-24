#!/usr/bin/env bash

. bin/common.sh

if [ ! -f $ENV_DIR/.sops.yaml ]; then
  echo 'No .sops.yaml found. Generating one.'
  (bin/gen-sops.sh)
fi
echo 'Encrypting new files...'
crypt encrypt
echo 'Decrypting files...'
crypt decrypt
echo 'Validating values...'
bin/validate-values.sh
echo 'Deploying otomi after this!'
