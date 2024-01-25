FROM node:20-buster as builder

WORKDIR /app

RUN apt update
RUN apt install curl unzip -y

RUN curl https://bun.sh/install | bash

COPY package.json .
# COPY bun.lockb .
COPY tsconfig.json .
COPY prisma prisma

RUN /root/.bun/bin/bun install
RUN npx prisma generate

# ? -------------------------
FROM oven/bun

WORKDIR /app

ARG DATABASE_URL
ARG JWT_SECRET
ARG VITE_SERVER_PORT
ARG VITE_CLIENT_PORT
ARG VITE_SERVER_URL

ENV DATABASE_URL $DATABASE_URL
ENV JWT_SECRET $JWT_SECRET
ENV VITE_SERVER_PORT $VITE_SERVER_PORT
ENV VITE_CLIENT_PORT $VITE_CLIENT_PORT
ENV VITE_SERVER_URL $VITE_SERVER_URL

COPY --from=builder /root/.bun/bin/bun bun
# COPY --from=builder /root/.bun/bin/bunx bunx
COPY --from=builder /app/node_modules node_modules

COPY package.json .
COPY server server
COPY client client
# COPY public public
COPY tsconfig.json .
COPY utils utils

# WARNING: This is a hack to make vite work in azure. Chnage this to production later on when one origin is set up.

# ENV ENV production
# RUN bun run build

# CMD ["./bun", "vite", "dist", "--host", "0.0.0.0", "--port", "8100"]
CMD ["./bun", "run", "dev", "--host", "0.0.0.0", "--port", "8100"]
EXPOSE 8100
