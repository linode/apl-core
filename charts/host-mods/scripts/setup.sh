#!/usr/bin/env sh
dirty=false

# First copy to regular locations for provider distros
# we try by introspecting environment
cert_dir="/usr/local/share/ca-certificates" # Ubuntu, Debian
cert="$cert_dir/$REGISTRY_URL.crt"
[ -d "$cert_dir" ] && ! cat $cert | grep "$TRUSTED_CERT" >/dev/null 2>&1 && echo "$TRUSTED_CERT" >$cert && echo "Updating $cert" && update-ca-certificates && dirty=true
cert_dir="/etc/pki/ca-trust/source/anchors" # RHEL, Amazon Linux
cert="$cert_dir/$REGISTRY_URL.crt"
[ -d "$cert_dir" ] && ! cat $cert | grep "$TRUSTED_CERT" >/dev/null 2>&1 && echo "$TRUSTED_CERT" >$cert && echo "Updating $cert" && update-ca-trust && dirty=true

# Now try docker
if which docker >/dev/null 2>&1; then
  echo "Found docker setup!"
  # copy to expected docker location: https://docs.docker.com/registry/insecure/
  docker_dir="/etc/docker/certs.d/$REGISTRY_URL:443"
  [ ! -d $docker_dir ] && mkdir -p $docker_dir && dirty=true
  echo "$TRUSTED_CERT" >$docker_dir/ca.crt
fi

# containerd also?
if which containerd >/dev/null 2>&1; then
  # k8s started using containerd
  echo "Found containerd setup!"
  if [ -n "$CERT_DIR" ]; then
    # we were given specific location so update certs there
    echo "Got CERT_DIR: $CERT_DIR"
    [ ! -d "$cert_dir" ] && mkdir -p $CERT_DIR >/dev/null
    ! $dirty && ! cat $cert | grep "$TRUSTED_CERT" >/dev/null 2>&1 && dirty=true
    $dirty && echo "$TRUSTED_CERT" >$CERT_DIR/ca.crt
    [ -n "$UPDATE_CMD" ] && echo "Updating with cmd $UPDATE_CMD..." && $UPDATE_CMD
  elif which update-ca-certificates >/dev/null 2>&1; then
    # install in default location
    dir="/usr/local/share/ca-certificates"
    [ ! -d $dir ] && mkdir -p $dir >/dev/null
    cert="$dir/ca.crt"
    [ ! -f $cert ] && dirty=true
    ! $dirty && ! cat $cert | grep "$TRUSTED_CERT" >/dev/null 2>&1 && dirty=true
    $dirty && echo "$TRUSTED_CERT" >$cert && update-ca-certificates
  fi
fi

echo "All mods READY!"
if
  which containerd >/dev/null 2>&1 && $dirty
then
  echo "Restarting containerd..." && systemctl restart containerd
fi
