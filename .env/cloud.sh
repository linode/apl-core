export CLUSTER=${CLUSTER:-dev}
. bin/colors.sh

cd .env >/dev/null
c=(*/)
cd - >/dev/null
clouds="${c[@]%/}"
if [[ ! $clouds == *$CLOUD* ]]; then
  printf "${COLOR_RED}ERROR: The value of CLOUD env must be one of the following: ${COLOR_YELLOW}$clouds${COLOR_NC}\n"
else
  cd .env/$CLOUD >/dev/null
  c=(*.sh)
  cd - >/dev/null
  clusters="${c[@]%.sh}"
  if [[ ! $clusters == *$CLUSTER* ]]; then
    printf "${COLOR_RED}ERROR: The value of CLUSTER env must be one of the following: ${COLOR_YELLOW}$clusters${COLOR_NC}\n"
  fi
fi
# source dependent env vars
. $PWD/.env/$CLOUD/$CLUSTER.sh
