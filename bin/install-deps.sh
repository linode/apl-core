#!/usr/bin/env bash
set -eu
go install github.com/plexsystems/konstraint@latest
npm install -g json-dereference-cli

# Compare versions and update if necessary
helm plugin install https://github.com/databus23/helm-diff.git || echo "Skipping helm-diff"


echo "Set shell rc file:"
echo 'echo  export PATH="$HOME/go/bin:$PATH" >> $HOME/.zshrc'
echo 'echo  export PATH="$HOME/go/bin:$PATH" >> $HOME/.bashrc'
