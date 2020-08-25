#/usr/bin/env bash
set -e
match=".drone.tpl.yaml\|env.ini"
if git diff --cached --name-only | grep $match >/dev/null; then
  bin/gen-drone.sh
  git add */.drone.*.yml
fi
bin/crypt.sh enc
git add *.yaml
git commit -m 'Manual commit'
