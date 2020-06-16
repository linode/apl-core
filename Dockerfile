FROM otomi/tools:1.3.0

ENV APP_HOME=/home/app/stack
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

COPY . .

# TODO: have to fix tests (linked values now)
# RUN tests/lint.sh

CMD ["bin/deploy.sh"]
