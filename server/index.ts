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

  .resolve(({ cookie, set }) => {
    let userId: string | null = null;
    if (
      cookie &&
      cookie.access_token &&
      typeof cookie.access_token.value === "string" &&
      cookie.access_token.value !== "undefined"
    ) {
      try {
        userId = decrypt(cookie.access_token.value) as string;
      } catch (error) {
        console.error("Failed to decrypt token:", error);
      }
    } else {
      console.warn("No access token found in cookie.");
    }

    if (!userId) {
      console.warn("No valid access token found or failed to decrypt token.");
      // set.status = 401;
    }

    return { userId };
  })
  .use(auth)
  .use(admin)
  .use(api)
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
