npm run tasks:otomi-chart -- true
chmod a+w $OTOMI_ENV_DIR/env/charts/* &>/dev/null || exit 0 #some files are created by this task and need to change their permissions
