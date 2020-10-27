FROM node:14-slim as ci

ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME



COPY package*.json ./
COPY . .



# RUN cp -r .demo/env env/ && bin/validate-all.sh && bin/validate-templates.sh && rm -rf env/env

# RUN npm install
# COPY ./.cspell.json .

# RUN npm run spellcheck
FROM otomi/tools:1.4.7 as test
ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY . .
RUN cp -r .demo/ env/ && find env && bin/validate-all.sh && bin/validate-templates.sh

#-----------------------------
FROM otomi/tools:1.4.7 as prod



ENV APP_HOME=/home/app/stack
RUN mkdir -p $APP_HOME
WORKDIR $APP_HOME

COPY . .

RUN cp -r .demo/ env/ && find env && bin/validate-all.sh && bin/validate-templates.sh && rm -rf env

CMD ["bin/otomi"]