        #!/bin/bash
        set -e

        # Cleaning up the workdir(if lost+found is present)
        rm -rf *

        GITEA_USERNAME=$1
        GITEA_PASSWORD=$2
        COMMIT_MESSAGE=$3

        # Getting the full repository url
        export fullRepoUrl=$(params["repoUrl"])
        echo $fullRepoUrl

        # Removing the proto part ('https://')
        export url=${fullRepoUrl/"https://"/}

        echo GIT_URL = $url
        echo COMMIT_MESSAGE = $COMMIT_MESSAGE

        # Cloning the values
        git clone -c http.sslVerify=false https://$GITEA_USERNAME:$GITEA_PASSWORD@$url . # TODO: replace with ssh git cloning.

        if [[ $COMMIT_MESSAGE == *skip_ci* ]]; then
            echo -n "1" > $(results.CI_SKIP)
        fi

        echo -n "$(yq r env/settings.yaml otomi.version)" > $(results.OTOMI_VERSION)