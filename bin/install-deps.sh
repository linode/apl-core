#!/usr/bin/env bash
set -eu
go install github.com/noqcks/gucci@latest
go install github.com/plexsystems/konstraint@latest
npm install -g json-dereference-cli

# Desired version
helm_secrets_target_version="4.6.2"

# Get the installed version of helm-secrets
helm_secrets_installed_version=$(helm plugin list | awk '/secrets/ {print $2}')

# Compare versions and update if necessary
if [ -z "$helm_secrets_installed_version" ]; then
  echo "helm-secrets is not installed. Installing version $helm_secrets_target_version..."
  helm plugin install https://github.com/jkroepke/helm-secrets --version "$helm_secrets_target_version"
elif [ "$(printf '%s\n' "$helm_secrets_installed_version" "$helm_secrets_target_version" | sort -V | head -n1)" != "$helm_secrets_target_version" ]; then
  echo "Updating helm-secrets from version $helm_secrets_installed_version to $helm_secrets_target_version..."
  helm plugin uninstall secrets
  helm plugin install https://github.com/jkroepke/helm-secrets --version "$helm_secrets_target_version"
else
  echo "helm-secrets is up-to-date (version $helm_secrets_installed_version)."
fi

helm plugin install https://github.com/databus23/helm-diff.git || echo "Skipping helm-diff"


echo "Set shell rc file:"
echo 'echo  export PATH="$HOME/go/bin:$PATH" >> $HOME/.zshrc'
echo 'echo  export PATH="$HOME/go/bin:$PATH" >> $HOME/.bashrc'
