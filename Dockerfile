FROM otomi/tools:1.4.7 as prod

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY package*.json ./
RUN npm install
COPY . .
COPY ./.cspell.json .

RUN npm run lint:all

CMD ["bin/deploy.sh"]