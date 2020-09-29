#!/usr/bin/env bash
. bin/common.sh
set -e

# source env
ENV_DIR=${ENV_DIR:-./env}

skip_demo_files=$1
[ -f $ENV_DIR/bin/otomi ] && has_otomi=true

# install CLI
otomi_path="${ENV_DIR}/bin/"
mkdir -p $otomi_path &>/dev/null
img="eu.gcr.io/otomi-cloud/otomi-stack:$(otomi_image_tag)"
echo "Installing artifacts from $img"
cp /home/app/stack/bin/aliases $otomi_path
cp /home/app/stack/bin/otomi $otomi_path
cp -r /home/app/stack/.values/.vscode $ENV_DIR/
# convert schema to loose json:
grep -v '"required":' /home/app/stack/values-schema.yaml | yaml2json >$ENV_DIR/.vscode/values-schema.json
for f in '.gitattributes' '.sops.yaml'; do
  [ ! -f $ENV_DIR/$f ] && cp /home/app/stack/.values/$f $ENV_DIR/
done
for f in '.gitignore' '.prettierrc.yml' 'README.md'; do
  cp /home/app/stack/.values/$f $ENV_DIR/
done
if [ "$skip_demo_files" != "1" ]; then
  echo "Installing demo files"
  cp -r /home/app/stack/.demo/env $ENV_DIR/env
fi
if [ ! $has_otomi ]; then
  echo "You can now use otomi CLI"
  echo "Start by sourcing aliases:"
  echo ". bin/aliases"
fi
