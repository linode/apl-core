FROM otomi/tools:1.4.5

ENV APP_HOME=/home/app/stack
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

COPY . .

RUN npm run lint:all

CMD ["bin/deploy.sh"]