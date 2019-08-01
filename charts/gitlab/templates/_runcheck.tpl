#!/bin/sh

notify() {
  echo "$1"
  echo -n "$1 " >> /dev/termination-log
}

greater_version()
{
  test "$(printf '%s\n' "$@" | sort -V | tail -n 1)" = "$1";
}

MIN_VERSION=11.11

# Only run check for semver releases
if ! awk 'BEGIN{exit(!(ARGV[1] ~ /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/))}' "$GITLAB_VERSION"; then
  exit 0
fi

NEW_MAJOR_VERSION=$(echo $GITLAB_VERSION | awk -F "." '{print $1}')
NEW_MINOR_VERSION=$(echo $GITLAB_VERSION | awk -F "." '{print $1"."$2}')

if [ ! -f /chart-info/gitlabVersion ]; then
  notify "It seems you are attempting an unsupported upgrade path."
  notify "Please follow the upgrade documentation at https://docs.gitlab.com/ee/policy/maintenance.html#upgrade-recommendations"
  notify "and upgrade to 11.11.3 (Chart Version 1.9.4) before upgrading to ${GITLAB_VERSION}."
  exit 1
fi

OLD_VERSION_STRING=$(cat /chart-info/gitlabVersion)

# Skip check if old version wasn't semver
if ! awk 'BEGIN{exit(!(ARGV[1] ~ /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/))}' "$OLD_VERSION_STRING"; then
  exit 0
fi

OLD_MAJOR_VERSION=$(echo $OLD_VERSION_STRING | awk -F "." '{print $1}')
OLD_MINOR_VERSION=$(echo $OLD_VERSION_STRING | awk -F "." '{print $1"."$2}')

# Checking
# (i) if it is a major version jump
# (ii) if existing version is less than required minimum version
if test ${OLD_MAJOR_VERSION} -lt ${NEW_MAJOR_VERSION}; then
  if ! greater_version $OLD_MINOR_VERSION $MIN_VERSION; then
    notify "It seems you are upgrading from ${OLD_MAJOR_VERSION}.x version series to ${NEW_MAJOR_VERSION}.x series."
    notify "It is recommended to upgrade to the last minor version in a major version series"
    notify "first before jumping to the next major version."
    notify "Please follow the upgrade documentation at https://docs.gitlab.com/ee/policy/maintenance.html#upgrade-recommendations"
    notify "and upgrade to 11.11.3 (Chart Version 1.9.4) first."
    exit 1
  fi
fi
