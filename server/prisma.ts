import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: ["query", "info", "warn"],
});


export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}
