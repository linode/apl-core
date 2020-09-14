#!/usr/bin/env bash
printf "${COLOR_LIGHT_PURPLE}Loading environment...${COLOR_NC}\n"
PACKAGE_VERSION=$(cat package.json | jq -r .version)

. bin/env.sh
noEnvError=$?

. bin/aliases
function drun() { $@; }

if [ $noEnvError -eq 0 ]; then
  img=eu.gcr.io/otomi-cloud/otomi-stack:v$PACKAGE_VERSION
  d --version &>/dev/null
  hasDocker=$?
  d ps &>/dev/null
  dockerRunning=$?

  # if not has docker: ci
  if [ $hasDocker -eq 0 ]; then
    echo "Found docker client, assuming developer context."
    uname -a | grep -i darwin >/dev/null
    if [ $? -eq 0 ]; then
      HELM_CONFIG="$HOME/Library/Preferences/helm"
    else
      HELM_CONFIG="$HOME/.config/helm"
    fi
    if [ $dockerRunning -eq 0 ]; then
      echo "Found docker running, will use $img instead of local tooling"
      function drun() {
        # execute any kubectl command to refresh access token
        k version >/dev/null
        d run -it --rm \
          -v $PWD:$PWD \
          -v /tmp:/tmp \
          -v ~/.kube/config:/home/app/.kube/config \
          -v $HELM_CONFIG:/home/app/.config/helm \
          -v ~/.config/gcloud:/home/app/.config/gcloud \
          -v ~/.aws:/home/app/.aws \
          -v ~/.azure:/home/app/.azure \
          -v $ENV_DIR:$PWD/env \
          -e K8S_CONTEXT=$K8S_CONTEXT \
          -e CLOUD=$CLOUD \
          -e GCLOUD_SERVICE_KEY="$GCLOUD_SERVICE_KEY" \
          -e CLUSTER=$CLUSTER \
          -w $PWD $img $@
      }
      # unalias h hf_ hk aw gc &>/dev/null
      function h() { drun helm $@; }
      function hf_() { drun helmfile $@; }
      function hk() { drun helm delete $@; }
      function aw() { drun aws $@; }
      function az() { drun az $@; }
      function gc() { drun gcloud $@; }
      export drun h hf_ hk
    else
      echo "No docker daemon running. Please start and source aliases again."
    fi
  fi

  function kpo() {
    labels=$1
    shift
    pod=$(k get po -l "$labels" $@ -ojsonpath='{.items[0].metadata.name}')
    k delete po $pod $@
  }
  function kpk() { ps aux | grep "$@" | awk '{print $2}' | xargs kill; }
  function kad() { k delete "$@" --all; }
  function kdnp() {
    for ns in default kube-system system monitoring ingress shared; do
      kad networkpolicy -n $ns
    done
  }
  # force erase all namespaces
  function kkns() {
    k proxy &
    k get ns | grep Terminating | awk '{print $1}' | xargs -n1 -- bash -c 'kubectl get ns "$0" -o json | jq "del(.spec.finalizers[0])" > "$0.json"; curl -k -H "Content-Type: application/json" -X PUT --data-binary @"$0.json" "http://127.0.0.1:8001/api/v1/namespaces/$0/finalize"; rm  "$0.json"'
    kk
  }
  # erase entire stack but keep nodes
  function kkc() {
    k delete crd $(k get crd | egrep "cert-manager|istio|ory|coreos|knative|velero" | awk '{print $1}')
    hf_ -e ${CLOUD}-$CLUSTER destroy
    k delete ns --all
  }

  if [ $hasDocker -eq 0 ]; then
    kcu $K8S_CONTEXT >/dev/null
    if [ $? -ne 0 ] && [ "$CLOUD" = "aws" ]; then
      # check if we have a mismatching context for an aws cluster
      chek=$(k config get-contexts | grep $K8S_CONTEXT | awk '{print $2}')
      aw eks --region $AWS_REGION update-kubeconfig --name $K8S_CONTEXT
      echo "Renaming aws context '$chek' to '$K8S_CONTEXT'"
      k config rename-context $chek $K8S_CONTEXT
      kcu $K8S_CONTEXT
    fi

    function hf() {
      err=$(kcu $K8S_CONTEXT)
      # first test still in right context, else bork
      if [ $? -ne 0 ]; then
        echo $err
      else
        drun helmfile -e ${CLOUD}-$CLUSTER $@
      fi
    }
  else
    function hf() {
      helmfile -e ${CLOUD}-$CLUSTER $@
    }
  fi

  # environment scoped, no deps, so faster:
  function hfd() { hf $@ --skip-deps; }
  # templates only without cruft:
  function hft() { hfd --quiet $@ template | grep -vi skipping | grep -vi "helmfile-"; }

  printf "${COLOR_LIGHT_PURPLE}DONE!${COLOR_NC}\n"
  printf "${COLOR_LIGHT_BLUE}Aliases loaded targeting ${COLOR_LIGHT_GREEN}CLOUD ${COLOR_YELLOW}$CLOUD${COLOR_LIGHT_BLUE} and ${COLOR_LIGHT_GREEN}CLUSTER ${COLOR_YELLOW}$CLUSTER${COLOR_NC}\n"
else
  printf "${COLOR_RED}ERROR!${COLOR_NC}\n"
fi
