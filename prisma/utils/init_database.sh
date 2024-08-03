#!/usr/bin/env bash
echo '{
  "name": "db-init",
  "version": "1.0.0",
  "license": "MIT",
  "dependencies": {
    "prisma": "^5.6.0",
    "@prisma/client": "^5.6.0",
    "@paralleldrive/cuid2": "^2.2.2",
    "typescript": "^5.5.4",
    "bun-types": "latest",
    "bun": "latest"
  },
  "prisma": {
    "seed": "./init_database"
  }
}' > package.json

yarn install --no-lockfile
npx bun build ./init_database.ts --compile --outfile init_database
npx prisma migrate reset --force
