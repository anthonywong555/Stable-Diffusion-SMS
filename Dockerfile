FROM node:lts-alpine@sha256:2c405ed42fc0fd6aacbe5730042640450e5ec030bada7617beac88f742b6997b

RUN apk update

RUN apk add dumb-init

ENV NODE_ENV production

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

USER node

RUN npm ci --only=production

COPY --chown=node:node ./ ./

CMD [ "dumb-init", "node", "./src/index.js" ]