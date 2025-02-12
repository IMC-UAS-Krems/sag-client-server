import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { logger } from "@bogeychan/elysia-logger";
import pretty from "pino-pretty";
import { jwt } from "@elysiajs/jwt";

import { auth } from "@server/routes/auth";
import { api } from "@server/routes/api";
import { admin } from "@server/routes/admin";
import { panic } from "@utils/panic";
import { updateUser } from "./sql";

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
  .resolve(async ({ jwt, cookie, headers }) => {
    interface Token {
      userId: string;
      userRole: string;
      email: string;
    }
    enum AuthType {
      Cookie,
      Header,
      None,
    }
    // TODO: not this many confused variables maybe?
    // NOTE: tokenStr -> verifiedToken -> jwtToken
    let authType = AuthType.None;
    // raw JWT token
    let tokenStr = "";
    // token after jwt.verify()
    let verifiedToken: unknown | null = null;
    // verifiedToken casted to `Token`
    let jwtToken: Token | null = null; // tets

    if (cookie.jwtUser && cookie.jwtToken.value !== undefined) {
      authType = AuthType.Cookie;
      tokenStr = cookie.jwtToken.value;
    } else if (headers.authorization !== undefined) {
      if (headers.authorization.match("^Bearer .+$") !== null) {
        authType = AuthType.Header;
        tokenStr = headers.authorization.slice(7);
      }
    }

    if (authType === AuthType.None && tokenStr === "") {
      console.warn("No JWT token found in cookies or Authorization header.");
      return { userId: null };
    }

    try {
      verifiedToken = (await jwt.verify(tokenStr)) as unknown;
      if (typeof verifiedToken === "object" && verifiedToken !== null && "userId" in verifiedToken) {
        jwtToken = verifiedToken as Token;
        // Here we can update the last login time of the user
        // NOTE: I don't think we need to update the api token each time
        if (authType === AuthType.Cookie) {
          try {
            await updateUser(jwtToken.userId, { lastTimeActive: new Date() });
          } catch (error) {
            console.error("Failed to update last login time:", error);
          }
        } else {
          console.warn("JWT verification failed or returned an invalid token.");
        }
      }
    } catch (error) {
      console.error("Failed to verify JWT token:", error);
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
