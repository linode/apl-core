#!/bin/bash
set -e

export fullRepoUrl=$(params["repoUrl"])

echo $fullRepoUrl

#Removing the proto part ('https://')
export url=${fullRepoUrl/"https://"/}

echo $url

#Cloning the values
git clone -c http.sslVerify=false https://$(params["gitea_user"]):$(params["gitea_password"])@$url .' #TODO: replace with ssh git cloning.
