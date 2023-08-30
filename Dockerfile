FROM node:18-bullseye

RUN apt-get -y update \
    && apt-get -y install tini \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR "/srv"

COPY package.json package-lock.json tsconfig.json ./
COPY src ./src

RUN npm install \
 && npm run build \
 && chown -R root:root /srv

ENV NODE_ENV="production"

EXPOSE 3000/tcp
VOLUME ["/root/.npm", "/root/.rgb-proxy-server"]

CMD ["tini", "--", "npm", "run", "start"]
