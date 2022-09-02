FROM node:lts-alpine@sha256:2c405ed42fc0fd6aacbe5730042640450e5ec030bada7617beac88f742b6997b

RUN apk update

RUN apk add dumb-init

ENV NODE_ENV production

RUN mkdir -p /usr/src/app/node_modules && chown -R node:node /usr/src/app

WORKDIR /usr/src/app

COPY package*.json ./

USER node

RUN npm ci --only=production

COPY --chown=node:node ./ /usr/src/app/

CMD [ "dumb-init", "node", "./src/index.js" ]