function aw() { aws $@; }
function gc() { gcloud $@; }
function h() { helm $@; }
function hk() { helm delete $@; }
function hf_() { helmfile $@; }

alias otomi="bin/otomi"
alias d="docker"
alias k="kubectl"
alias ksk="k -n kube-system"
alias ki="k -n ingress"
alias kh="k -n harbor"
alias kis="k -n istio-system"
alias kk="k -n keycloak"
alias ks="k -n system"
alias ksh="k -n shared"
alias km="k -n monitoring"
alias kta="k -n team-admin"
alias ka="k --all-namespaces=true"
alias kaa="ka get po,rs,job,deploy,ds,statefulset,svc"
alias kap="ka get po"
alias kdel="k delete"
alias kcv="k config view"
alias kce="$EDITOR ~/.kube/config"
alias kcg="k config current-context"
alias kcu="k config use-context"
alias kp="k proxy &"
alias kp="killall kubectl"
