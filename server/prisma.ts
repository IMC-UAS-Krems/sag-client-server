import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: ["query", "info", "warn"],
});

export enum UserRole {
  DEV = "Developer",
  MAN = "Manager",
  ADMIN = "Administrator",
}
