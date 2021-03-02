#!/usr/local/env bash

# Login

# Create body

# Run curl "/user/repos"
auth_header=$(echo -ne "$GITEA_ADMIN:$GITEA_PASSWORD" | base64 --wrap 0)
auth="authorization: Basic $auth_header"
curl_common=( --output /dev/null --silent --fail )
curl_headers=( -H 'accept: application/json' -H "$auth" )


function run_curl() {
    type=$1
    shift
    path=$1
    shift
    echo "curl ${curl_common[@]} ${curl_headers[@]} -X $type $GITEA_URL/api/v1/$path $@"
    curl "${curl_common[@]}" "${curl_headers[@]}" -X $type "$GITEA_URL/api/v1/$path" "$@"
}
#Login
out=$(run_curl GET user)
ret=$?
echo "Login ($ret): $out"

out=$(run_curl GET "repos/$GITEA_ADMIN/$GITEA_VALUES_REPO")
ret=$?
echo "Has Repo($ret): $out"

if [ $ret -ne 0 ]; then
    #Repo doesn't exist, so create
    data="{\"name\": \"$GITEA_VALUES_REPO\", \"auto_init\": false}"
    out=$(run_curl POST user/repos  -H "Content-Type: application/json" --data "$data")
    ret=$?
    echo "Create Repo($ret): $out"
else
    echo "Repo already exists"
fi


# $(curl $INSECURE --output /dev/null --silent --head --fail -I $GITEA_URL)