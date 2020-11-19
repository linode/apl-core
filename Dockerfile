FROM otomi/tools:1.4.9  as ci
# yq/jq missing in node image. using otomi/tools

ARG SKIP_TESTS='false'
ENV EXIT_FAST='true'

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY package*.json ./
COPY . .
COPY ./.cspell.json .
RUN cp -r .demo/ env/ 

RUN [ "$SKIP_TESTS" = 'false' ] && \
  npm install && \
  npm run spellcheck && \
  bin/validate-values.sh && \
  bin/validate-templates.sh 

#-----------------------------
FROM otomi/tools:1.4.9 as prod

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY . .

CMD ["bin/otomi"]