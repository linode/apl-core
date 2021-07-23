function yqr_chart() {
  local ret=$(cat $OTOMI_VALUES_INPUT | yq r - "$@")
  [ -z "$ret" ] && return 1
  echo $ret
}

readonly stage=$(yqr_chart charts.cert-manager.stage || echo 'production')
if [ "$stage" = "staging" ]; then
  export GIT_SSL_NO_VERIFY=true
fi
