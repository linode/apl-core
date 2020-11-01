#!/usr/bin/env bash
set -eu

ENV_DIR=${ENV_DIR:-./env}
. bin/common.sh

. $ENV_DIR/.secrets

skip_demo_files=$1
[ -f $ENV_DIR/bin/otomi ] && has_otomi=true

function generate_loose_schema() {
  local targetPath="$ENV_DIR/.vscode/values-schema.yaml"
  local sourcePath="$PWD/values-schema.yaml"
  yq d $sourcePath '**.required.' | yq d - 'properties.toolsVersion' | yq d - 'properties.cluster' >$targetPath
  echo "Stored JSON schema at: $targetPath"
}

# install CLI
bin_path="${ENV_DIR}/bin"
mkdir -p $bin_path &>/dev/null
img="otomi/core:$(otomi_image_tag)"
echo "Installing artifacts from $img"
for f in 'aliases' 'common.sh' 'otomi'; do
  cp $PWD/bin/$f $bin_path/
done
cp -r $PWD/.values/.vscode $ENV_DIR/

generate_loose_schema

for f in '.gitattributes' '.sops.yaml'; do
  [ ! -f $ENV_DIR/$f ] && cp $PWD/.values/$f $ENV_DIR/
done
for f in '.gitignore' '.prettierrc.yml' 'README.md'; do
  cp $PWD/.values/$f $ENV_DIR/
done
if [ "$skip_demo_files" != "1" ]; then
  echo "Installing demo files"
  cp -r $PWD/.demo/env $ENV_DIR/env
fi
cp -f $PWD/bin/hooks/pre-commit $ENV_DIR/.git/hooks/
[ "${GCLOUD_SERVICE_KEY-}" != "" ] && echo $GCLOUD_SERVICE_KEY | jq '.' >$ENV_DIR/gcp-key.json
if [ "${OTOMI_PULLSECRET-}" != "" ]; then
  echo "Copying Otomi Console setup"
  cp -rf $PWD/docker-compose $ENV_DIR/
  cp -f $PWD/core.yaml $ENV_DIR/
  cp -f $PWD/docker-compose.yml $ENV_DIR/
  cp -f $PWD/bin/console.sh $bin_path
fi
if [ ! $has_otomi ]; then
  echo "You can now use otomi CLI"
  echo "Start by sourcing aliases:"
  echo ". bin/aliases"
fi
echo "Done!"
