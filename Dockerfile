FROM node:slim as ci

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run lint

FROM otomi/tools:1.4.5 as prod

ENV APP_HOME=/home/app/stack
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

COPY . .

CMD ["bin/deploy.sh"]