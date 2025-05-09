#!/usr/bin/env bash
set -eu

gpg --batch --import "$TMP_RAW_GPG_KEY"
