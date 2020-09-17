FROM otomi/tools:1.4.5

ENV APP_HOME=/home/app/stack
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

COPY --chown=app:app . . 

CMD ["bin/deploy.sh"]