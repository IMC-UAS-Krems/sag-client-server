import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { logger } from "@bogeychan/elysia-logger";
import pretty from "pino-pretty";
import { jwt } from "@elysiajs/jwt";

import { auth } from "@server/routes/auth.ts";
import { api } from "@server/routes/api.ts";
import { admin } from "@server/routes/admin.ts";
import { panic } from "@utils/panic.ts";
import { updateUser } from "./sql.ts";

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
  .use(
    jwt({
      name: "jwt",
      secret: Bun.env.JWT_SECRET ?? panic("JWT_SECRET environment variable not set"),
    }),
  )
  .resolve(async ({ jwt, cookie }) => {
    interface Token {
      userId: string;
      userRole: string;
      email: string;
    }
    let jwtToken: Token | null = null;
    if (cookie.jwtUser && cookie.jwtToken.value !== undefined) {
      try {
        const verifiedToken = (await jwt.verify(cookie.jwtToken.value)) as unknown;
        if (typeof verifiedToken === "object" && verifiedToken !== null && "userId" in verifiedToken) {
          jwtToken = verifiedToken as Token;
          // Here we can update the last login time of the user
          try {
            await updateUser(jwtToken.userId, { lastTimeActive: new Date() });
          } catch (error) {
            console.error("Failed to update last login time:", error);
          }
        } else {
          console.warn("JWT verification failed or returned an invalid token.");
        }
      } catch (error) {
        console.error("Failed to verify JWT token:", error);
      }
    } else {
      console.warn("No JWT token found in cookies.");
    }

    return { userId: jwtToken ? jwtToken.userId : null };
  })
  .use(auth)
  .use(admin)
  .use(api)
  .get("/status", async ({ set }) => {
    const statuses = ["Single", "In a relationship", "Married", "In love", "It's complicated"];
    set.status = 200;
    return statuses[Math.floor(Math.random() * statuses.length)];
  })
  .get("/", async ({ redirect }) => {
    return redirect("/status");
  })
  .listen({ port: "9512", hostname: "0.0.0.0" });

export type Router = typeof app;

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
