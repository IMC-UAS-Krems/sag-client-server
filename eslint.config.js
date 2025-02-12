import safeql from "@ts-safeql/eslint-plugin/config";
import tseslint from "typescript-eslint";
import eslint from "@eslint/js";
import { expand } from "dotenv-expand";
import { config } from "dotenv";

expand(config());
console.log(process.env);

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  safeql.configs.connections({
    // ... (read more about configuration in the API docs)
    connectionUrl: process.env.DATABASE_URL,
    migrationsDir: "./prisma/migrations",
    targets: [
      // this will lint syntax that matches
      // `prisma.$queryRaw` or `prisma.$executeRaw`
      { tag: "prisma.+($queryRaw|$executeRaw)", transform: "{type}[]" },
    ],
  }),
);
