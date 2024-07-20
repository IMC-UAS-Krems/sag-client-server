#!/usr/bin/env bash
echo '{
  "name": "db-init",
  "version": "1.0.0",
  "license": "MIT",
  "dependencies": {
    "prisma": "^4.8.1",
    "@prisma/client": "^4.8.1"
  },
  "prisma": {
    "seed": "node ./init_database.js"
  }
}' > package.json

yarn install
npx prisma migrate reset --force
