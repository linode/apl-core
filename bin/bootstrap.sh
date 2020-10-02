#!/usr/bin/env bash
. bin/common.sh
set -e

ENV_DIR=${ENV_DIR:-./env}
. $ENV_DIR/.secrets

skip_demo_files=$1
[ -f $ENV_DIR/bin/otomi ] && has_otomi=true

# install CLI
bin_path="${ENV_DIR}/bin"
mkdir -p $bin_path &>/dev/null
img="eu.gcr.io/otomi-cloud/otomi-stack:$(otomi_image_tag)"
echo "Installing artifacts from $img"
for f in 'aliases' 'common.sh' 'otomi'; do
  cp $PWD/bin/$f $bin_path/
done
cp -r $PWD/.values/.vscode $ENV_DIR/
# convert schema to loose json:
grep -v 'required:' $PWD/values-schema.yaml >$ENV_DIR/.vscode/values-schema.yaml
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
if [ "$OTOMI_PULLSECRET" != "" ]; then
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
