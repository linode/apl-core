FROM otomi/tools:1.3.4

ENV APP_HOME=/home/app/stack
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

COPY . .

CMD ["bin/deploy.sh"]