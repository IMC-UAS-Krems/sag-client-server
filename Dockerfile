FROM node:20 AS builder

WORKDIR /app

RUN apt-get update
RUN apt-get install curl unzip -y

RUN curl https://bun.sh/install | bash

COPY package.json .
COPY bun.lockb .
COPY tsconfig.json .

RUN /root/.bun/bin/bun install --frozen-lockfile --production

# ----
FROM oven/bun

WORKDIR /app

ARG VITE_SERVER_URL
ENV VITE_SERVER_URL $VITE_SERVER_URL

ARG VITE_DEPLOYER_URL
ENV VITE_DEPLOYER_URL $VITE_DEPLOYER_URL


# COPY --from=builder /root/.bun/bin/bun bun
# COPY --from=builder /root/.bun/bin/bunx bunx
COPY --from=builder /app/node_modules node_modules

COPY package.json .
COPY server server
COPY client client
# COPY public public
COPY tsconfig.json .
COPY utils utils

ENV ENV production
RUN bun run build

CMD ["bun", "vite", "dist", "--host", "0.0.0.0", "--port", "8100"]
# CMD ["bun", "run", "dev", "--host", "0.0.0.0", "--port", "8100"]
EXPOSE 8100
