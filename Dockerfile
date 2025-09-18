FROM node:20-slim AS builder

WORKDIR /usr/app

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY nest-cli.json .
COPY tsconfig.build.json .
COPY tsconfig.json .
COPY /src ./src

RUN npm run build

FROM node:20-alpine

WORKDIR /usr/app

ARG USERNAME=node

COPY --chown=$USERNAME:$USERNAME package.json .
COPY --chown=$USERNAME:$USERNAME package-lock.json .
RUN npm ci --only=prod --no-optional

COPY --chown=$USERNAME:$USERNAME --from=builder /usr/app/dist /usr/app/dist

USER $USERNAME

CMD ["npm", "run", "start:prod"]
#CMD ["sh", "-c", "npm run start:prod || tail -f /dev/null"]
