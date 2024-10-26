FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update
RUN apt-get install curl unzip python3 git build-essential -y

RUN curl https://bun.sh/install | bash

COPY package.json .
COPY bun.lockb .
COPY postcss.config.cjs .
COPY tsconfig.json .
COPY tailwind.config.js .

COPY server server
COPY client client
COPY utils utils

RUN /root/.bun/bin/bun install --frozen-lockfile

ARG VITE_SERVER_URL
ENV VITE_SERVER_URL $VITE_SERVER_URL

ARG VITE_DEPLOYER_URL
ENV VITE_DEPLOYER_URL $VITE_DEPLOYER_URL

ARG VITE_COOKIES_EXPIRATION
ENV VITE_COOKIES_EXPIRATION $VITE_COOKIES_EXPIRATION

ARG VITE_AUTH_CHECK_INTERVAL
ENV VITE_AUTH_CHECK_INTERVAL $VITE_AUTH_CHECK_INTERVAL

RUN /root/.bun/bin/bun run build

# ----
FROM oven/bun

WORKDIR /app

# COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/dist dist

RUN bun add vite

ENV ENV production

CMD ["bun", "vite", "dist", "--host", "0.0.0.0", "--port", "8100"]

EXPOSE 8100
