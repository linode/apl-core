#!/usr/bin/env bash
set -eu

ENV_DIR=${ENV_DIR:-./env}
. bin/common.sh

secrets_file="$ENV_DIR/.secrets"

if [ -f $secrets_file ]; then
  source $secrets_file
else
  cp $PWD/.values/.secrets.sample $secrets_file
fi

has_otomi='false'
[ -f $ENV_DIR/bin/otomi ] && has_otomi='true'

function generate_loose_schema() {
  local targetPath="$ENV_DIR/.vscode/values-schema.yaml"
  local sourcePath="$PWD/values-schema.yaml"
  yq r -j "${sourcePath}" | jq "del(.. | .required?)" | yq r --prettyPrint - >"$targetPath"
  # yq d $sourcePath '**.required.' | yq d - 'properties.toolsVersion' | yq d - 'properties.cluster' >$targetPath
  # also put a copy in the .values folder for local hinting of .demo/env/*.yaml files:
  [ "$PWD" != "/home/app/stack" ] && cp $targetPath .values/
  echo "Stored YAML schema at: $targetPath"
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

for f in '.gitattributes' '.sops.yaml.sample' '.secrets.sample'; do
  [ ! -f $ENV_DIR/$f ] && cp $PWD/.values/$f $ENV_DIR/
done
for f in '.gitignore' '.prettierrc.yml' 'README.md'; do
  cp $PWD/.values/$f $ENV_DIR/
done
if [ ! -d "$ENV_DIR/env" ]; then
  readonly profile=$1
  readonly commonProfilePath=$PWD/profiles/common/env
  readonly profilePath=$PWD/profiles/$profile/env
  [ -z $profile ] && echo "Missing profile argument: Possible options: [$(ls profiles | xargs)]" && exit 1

  echo "No files found in "$ENV_DIR/env". Initiliazing configuration files"
  cp -r $commonProfilePath $ENV_DIR
  cp -r $profilePath $ENV_DIR
fi
git init $ENV_DIR
cp -f $PWD/bin/hooks/pre-commit $ENV_DIR/.git/hooks/
# to accomodate sops plugin in vscode:
[ "${GCLOUD_SERVICE_KEY-}" != '' ] && echo $GCLOUD_SERVICE_KEY | jq '.' >$ENV_DIR/gcp-key.json
secrets_file="$ENV_DIR/env/secrets.settings.yaml"
if [ -f "$secrets_file" ] && [ "$(cat $secrets_file | yq r - 'otomi.pullSecret')" != '' ]; then
  echo "Copying Otomi Console setup"
  cp -rf $PWD/docker-compose $ENV_DIR/
  cp -f $PWD/core.yaml $ENV_DIR/
  cp -f $PWD/docker-compose.yml $ENV_DIR/
fi
if [ "$has_otomi" = 'false' ]; then
  echo "You can now use otomi CLI"
  echo "Start by sourcing aliases:"
  echo ". bin/aliases"
fi
echo "Done!"
