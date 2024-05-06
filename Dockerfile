FROM docker.io/node:18-alpine as dependencies_and_build

WORKDIR /app
COPY ./package-lock.json ./package.json ./tsconfig.json ./index.js ./LICENSE ./
COPY ./src ./src

RUN apk add --no-cache --virtual .buildtools npm make gcc g++ linux-headers udev git python3 && \
    npm ci --no-audit --no-optional --no-update-notifier --unsafe-perm && \
    npm run build && \
    rm -rf node_modules && \
    npm ci --no-audit --no-optional --no-update-notifier --production --unsafe-perm && \
    # Serialport needs to be rebuild for Alpine https://serialport.io/docs/9.x.x/guide-installation#alpine-linux
    npm rebuild --build-from-source && \
    apk del .buildtools

####################
# 1 Install apps   #
####################

FROM alpine:3.19.1 as release

WORKDIR /app

RUN apk add --no-cache npm 

COPY --from=dependencies_and_build /app/node_modules ./node_modules
COPY --from=dependencies_and_build /app/dist ./dist
COPY --from=dependencies_and_build /app/package.json /app/LICENSE /app/index.js ./

ENV NODE_ENV production

CMD ["node", "index.js"]