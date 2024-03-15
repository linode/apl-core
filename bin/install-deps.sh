#!/usr/bin/env bash
set -eu
go install github.com/noqcks/gucci@latest
go install github.com/plexsystems/konstraint@latest
npm install -g json-dereference-cli

helm plugin install https://github.com/databus23/helm-diff.git
helm plugin install https://github.com/jkroepke/helm-secrets.git --version v3.15.

echo "Set shell rc file:"
echo 'echo  export PATH="$HOME/go/bin:$PATH" >> $HOME/.zshrc'
echo 'echo  export PATH="$HOME/go/bin:$PATH" >> $HOME/.bashrc'
