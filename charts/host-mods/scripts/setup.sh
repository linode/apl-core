#!/usr/bin/env sh

if [ -f /otomi/hascontainerd ]; then
  # k8s started using containerd
  echo "Found containerd setup!"
  cert="/usr/local/share/ca-certificates/ca.crt"
  if ! cat $cert | grep "$TRUSTED_CERT"; then dirty=true; fi
  $dirty && echo "$TRUSTED_CERT" >$cert && update-ca-certificates && echo "Restarting containerd..." && systemctl restart containerd
else
  dirty=false
  echo "Found docker setup!"
  # copy to expected docker location: https://docs.docker.com/registry/insecure/
  docker_dir="/etc/docker/certs.d/$REGISTRY_URL:443"
  [ ! -d $docker_dir ] && mkdir -p $docker_dir
  echo "$TRUSTED_CERT" >$docker_dir/ca.crt
  # Also copy to regular locations for provider distros
  if [ -n "$CERT_DIR" ]; then
    echo "Got CERT_DIR: $CERT_DIR"
    [ ! -d "$cert_dir" ] && mkdir -p $CERT_DIR
    echo "$TRUSTED_CERT" >$CERT_DIR/$REGISTRY_URL.crt
    # We assume UPDATE_CMD is set (may be empty string):
    $UPDATE_CMD
  else
    # we try by introspecting environment
    cert_dir="/usr/local/share/ca-certificates" # Ubuntu, Debian
    cert="$cert_dir/$REGISTRY_URL.crt"
    [ -d "$cert_dir" ] && ! cat $cert | grep "$TRUSTED_CERT" && echo "$TRUSTED_CERT" >$cert && update-ca-certificates
    cert_dir="/etc/pki/ca-trust/source/anchors" # RHEL, Amazon Linux
    cert="$cert_dir/$REGISTRY_URL.crt"
    [ -d "$cert_dir" ] && ! cat $cert | grep "$TRUSTED_CERT" && echo "$TRUSTED_CERT" >$cert && update-ca-trust
  fi
  # restarting docker is rather invasive as it will restart all containers one time,
  # so we only do it when we have changed something during this run
  if $dirty; then
    echo "All mods READY!"
  else
    echo "Already modded. Nothing to be done."
  fi
fi
