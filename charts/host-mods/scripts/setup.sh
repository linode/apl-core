#!/usr/bin/env sh

dirty=false
if which containerd; then
  # k8s started using containerd
  echo "Found containerd setup!"
  cert="/usr/local/share/ca-certificates/ca.crt"
  if [ ! -f $cert ] || ! cat $cert | grep "$TRUSTED_CERT" >/dev/null; then dirty=true; fi
  $dirty && echo "$TRUSTED_CERT" >$cert && update-ca-certificates && echo "Restarting containerd..." && systemctl restart containerd
else
  echo "Found docker setup!"
  # copy to expected docker location: https://docs.docker.com/registry/insecure/
  docker_dir="/etc/docker/certs.d/$REGISTRY_URL:443"
  [ ! -d $docker_dir ] && mkdir -p $docker_dir && dirty=true
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
fi
if $dirty; then
  echo "All mods READY!"
else
  echo "Already modded. Nothing to be done."
fi
