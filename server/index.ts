import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { logger } from "@bogeychan/elysia-logger";
import pretty from "pino-pretty";
import { auth, decrypt } from "@server/routes/auth";
import { api } from "@server/routes/api";
import { admin } from "@server/routes/admin";

// TODO: @elysiajs/cookie not needed, can be reverted to original
// TODO: check cors settings for production

const app = new Elysia()
  .use(
    logger({
      level: "info",
      stream: pretty({ colorize: true }),
    }),
  )
  .use(
    cors({
      credentials: true,
      // methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "*"],
      origin: true,
    }),
  )
  .use(
    swagger({
      autoDarkMode: true,
      path: "/docs",
      exclude: ["/docs", "/docs/json", "/"],
      documentation: {
        info: {
          title: "Sagittarius",
          version: "1.0.0",
          description: "Sagittarius API",
        },
        tags: [{ name: "auth" }, { name: "admin" }, { name: "api" }],
      },
    }),
  )
  .resolve(({ cookie }) => {
  if (!cookie || !cookie.access_token) {
    console.warn("No access token found in cookies");
    return { userId: null };
  }

  try {
    const id = decrypt(cookie.access_token.value) as string;
    return { userId: id };
  } catch (error) {
    console.error("Failed to decrypt token:", error);
    return { userId: null };
  }
})
  .use(api)
  .use(auth)
  .use(admin)
  .get("/status", async ({ set }) => {
    const statuses = ["Single", "In a relationship", "Married", "In love", "It's complicated"];
    set.status = 200;
    return statuses[Math.floor(Math.random() * statuses.length)];
  })
  .get("/", async ({ set, redirect }) => {
    return redirect("/status");
  })
  .listen({ port: "9512", hostname: "0.0.0.0" });

export type Router = typeof app;

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
