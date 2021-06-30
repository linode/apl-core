#!/usr/bin/env bash

echo 'Trying to add all the files and commit & push...'
(
  git add -A
  git commit --no-verify -m "automated commit of otomi-values"
  git push -u origin main -f
  git branch --set-upstream-to=origin/main main
) &>/dev/null
