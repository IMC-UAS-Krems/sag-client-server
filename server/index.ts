import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { jwt } from "@elysiajs/jwt";
import { cors } from "@elysiajs/cors";
import { prisma } from "@∆";
import { User, Prisma, ConsumerLevel, ProducerLevel } from "@prisma/client";
import { logger } from "@bogeychan/elysia-logger";
import pretty from "pino-pretty";
import { panic } from "@utils/panic";
import crypt from "ncrypt-js";

const { encrypt, decrypt } = new crypt(
  Bun.env.JWT_SECRET ?? panic("JWT_SECRET environment variable not set")
);
const COMPILER_URL = Bun.env.COMPILER_URL || "http://localhost:8080";

// TODO: @elysiajs/cookie not needed, can be reverted to original
// TODO: check cors settings for production

type UserResult = {
  name: string;
  email: string;
  username: string;
  municipality: {
    name: string;
  } | null;
  organisation: {
    name: string;
  } | null;
  project: {
    name: string;
  } | null;
  writePrivilege: ProducerLevel;
  readPrivilege: ConsumerLevel;
  documents: {
    id: string;
    name: string;
    version: number;
    createdAt: Date;
    updatedAt: Date | null;
  }[];
};

const app = new Elysia()
  .use(
    logger({
      level: "info",
      stream: pretty({ colorize: true }),
    })
  )
  .use(
    cors({
      credentials: true,
      // methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "*"],
      origin: true,
    })
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
    })
  )
  .group("/auth", (app) =>
    app
      .post(
        "/register",
        async ({
          log,
          set,
          body: {
            name,
            email,
            username,
            key,
            municipality,
            organisation,
            project,
          },
          cookie: { access_token },
        }): Promise<UserResult | undefined> => {
          try {
            log.info("Trying to create user");
            const { id, ...user } = await prisma.user.create({
              data: {
                name,
                email,
                username,
                password: key,
                municipality: municipality
                  ? {
                      connectOrCreate: {
                        where: {
                          name: municipality,
                        },
                        create: {
                          name: municipality,
                        },
                      },
                    }
                  : undefined,
                organisation:
                  organisation && municipality
                    ? {
                        connectOrCreate: {
                          where: {
                            name: organisation,
                          },
                          create: {
                            name: organisation,
                            municipality: {
                              connect: {
                                name: municipality,
                              },
                            },
                          },
                        },
                      }
                    : undefined,
                project:
                  project && organisation
                    ? {
                        connectOrCreate: {
                          where: {
                            name: project,
                          },
                          create: {
                            name: project,
                            organisation: {
                              connect: {
                                name: organisation,
                              },
                            },
                          },
                        },
                      }
                    : undefined,
              },
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
                readPrivilege: true,
                writePrivilege: true,
                documents: {
                  select: {
                    id: true,
                    name: true,
                    version: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
                municipality: {
                  select: {
                    name: true,
                  },
                },
                organisation: {
                  select: {
                    name: true,
                  },
                },
                project: {
                  select: {
                    name: true,
                  },
                },
              },
            });

            log.info("Trying to create user done");
            set.status = 201;

            const token = encrypt(id);

            log.info(`Producing token: ${token}`);

            access_token.set({
              httpOnly: true,
              secure: true,
              sameSite: "none",
              path: "/", // default
              maxAge: 60 * 60 * 24 * 2, // 2 days
              value: token,
            });

            log.info(`User ${user.name} registered.`);

            return user;
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
              log.error(`PRISMA ERROR: ${error.message}. CODE: ${error.code}`);
              set.status = 400; // Bad Request
            } else {
              log.error(error);
              set.status = 500; // Internal Server Error
            }
          }
        },
        {
          body: t.Object({
            name: t.String({ minLength: 4 }),
            email: t.String({ format: "email" }),
            username: t.String({ minLength: 4 }),
            key: t.String({ minLength: 8 }),
            municipality: t.Optional(t.String()),
            organisation: t.Optional(t.String()),
            project: t.Optional(t.String()),
          }),
          cookie: t.Cookie({
            access_token: t.Optional(t.String()),
          }),
          detail: { tags: ["auth"] },
        }
      )
      .post(
        "/login",
        async ({
          log,
          set,
          body: { identifier, key },
          cookie: { access_token },
        }): Promise<UserResult | undefined> => {
          const select = {
            id: true,
            name: true,
            email: true,
            username: true,
            password: true,
            readPrivilege: true,
            writePrivilege: true,
            documents: {
              select: {
                id: true,
                name: true,
                version: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            municipality: {
              select: {
                name: true,
              },
            },
            organisation: {
              select: {
                name: true,
              },
            },
            project: {
              select: {
                name: true,
              },
            },
          };

          // try with email
          const userFromEmail = await prisma.user.findUnique({
            where: {
              email: identifier,
            },
            select,
          });

          const userWithPassword =
            userFromEmail ??
            (await prisma.user.findUnique({
              where: {
                username: identifier,
              },
              select,
            }));

          if (!userWithPassword) {
            set.status = 401; // Unauthorized
            log.warn(`User not found: ${identifier}`);
            return;
          }

          if (userWithPassword.password !== key) {
            set.status = 401; // Unauthorized
            log.warn(`Invalid password from user: ${identifier}`);
            return;
          }

          const { password, id, ...user } = userWithPassword;

          const token = encrypt(id);

          log.info(`Producing token: ${token}`);

          access_token.set({
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/", // default
            maxAge: 60 * 60 * 24 * 2, // 2 days
            value: token,
          });

          log.info(`User ${user.name} logged in.`);

          return user;
        },
        {
          body: t.Object({
            identifier: t.String() /** <-- Check for both email and username */,
            key: t.String({ minLength: 8 }),
          }),
          cookie: t.Cookie({
            access_token: t.Optional(t.String()),
          }),
          detail: { tags: ["auth"] },
        }
      )
      .post(
        "/logout",
        async ({ log, set, cookie: { access_token } }) => {
          console.log("cookie: ", cookie);
          access_token.set({
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/", // default
            value: "",
            expires: new Date(0),
          });

          set.status = 200;
        },
        {
          cookie: t.Cookie({
            access_token: t.String(),
          }),
          detail: { tags: ["auth"] },
        }
      )
  )
  .group("/admin", (app) => app)
  .group("/api", (app) =>
    app
      .get("/municipalities", async ({ set }) => {
        const municipalities = await prisma.municipality.findMany({
          select: {
            name: true,
          },
        });
        set.status = 200;
        return municipalities.map((m) => m.name);
      })
      .get(
        "/initialDocuments",
        async ({ log, set, cookie: { access_token } }) => {
          const id = decrypt(access_token.value) as string;
          console.log("id: ", id);

          const user = await prisma.user.findUnique({
            where: {
              id,
            },
            select: {
              email: true,
              id: true,
            },
          });

          if (!user) {
            set.status = 401; // Unauthorized
            log.warn(`User not found: ${id}`);
            return;
          }
          const documents = await prisma.user.findFirst({
            select: {
              initialDocuments: true,
            },
            where: {
              id: user.id,
            },
          });
          set.status = 200;
          return documents.initialDocuments;
        },
        {
          response: t.Array(t.Any()),
          cookie: t.Cookie({
            access_token: t.String(),
          }),
          detail: { tags: ["api"] },
        }
      )
      .post(
        "/initialDocuments",
        async ({ log, set, cookie, body: { documents } }) => {
          const id = decrypt(cookie.access_token.value) as string;
          console.log("id: ", id);
          // convert documents to JSON array

          const user = await prisma.user.findUnique({
            where: {
              id,
            },
            select: {
              email: true,
              id: true,
            },
          });

          if (!user) {
            set.status = 401; // Unauthorized
            log.warn(`User not found: ${id}`);
            return;
          }
          const updated_documents = await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              initialDocuments: documents,
            },
          });
          set.status = 200;
          return updated_documents.initialDocuments;
        },
        {
          body: t.Object({
            documents: t.Array(t.Any()),
          }),
          response: t.Array(t.Any()),
          cookie: t.Cookie({
            access_token: t.String(),
          }),
          detail: { tags: ["api"] },
        }
      )
      .post(
        "/compile",
        async ({ log, set, body: { code }, cookie }) => {
          const id = decrypt(cookie.access_token.value) as string;
          console.log("id: ", id);

          const user = await prisma.user.findUnique({
            where: {
              id,
            },
            select: {
              email: true,
              id: true,
            },
          });

          if (!user) {
            set.status = 401; // Unauthorized
            log.warn(`User not found: ${id}`);
            return { status: "error", error: "User not found" };
          }
          console.log(user);

          // "https://sagittarius-compose-production.up.railway.app/deploy",
          const compiled = await fetch(`${COMPILER_URL}/compile`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              source: code,
              user_id: user.id,
            }),
          });

          const data = await compiled.json();

          if (!compiled.ok || data.status == "error") {
            log.error(`${data.error}`);
            return data;
          }

          set.status = 200;
          log.info(`Data ${data} compiled.`);
          return data;
        },
        {
          body: t.Object({
            code: t.String(),
          }),
          // WARNING: wasn't able to make it work (fails even when the cookie is present)
          //
          cookie: t.Cookie({
            access_token: t.String(),
          }),
          response: t.Union([
            t.Object({ status: t.Literal("ok"), url: t.String() }),
            t.Object({ status: t.Literal("error"), errors: t.Array(t.Any()) }),
            t.Object({ status: t.Literal("error"), error: t.String() }),
          ]),
          detail: { tags: ["api"] },
        }
      )
      .post(
        "/check",
        async ({ log, set, body: { code }, cookie }) => {
          const id = decrypt(cookie.access_token) as string;
          console.log("id: ", id);

          const user = await prisma.user.findUnique({
            where: {
              id,
            },
            select: {
              email: true,
              id: true,
            },
          });

          if (!user) {
            set.status = 401; // Unauthorized
            log.warn(`User not found: ${id}`);
            return { status: "error", error: "User not found" };
          }
          console.log(user);

          // "https://sagittarius-compose-production.up.railway.app/deploy",
          const compiled = await fetch(`${COMPILER_URL}/check`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              source: code,
              user_id: user.id,
            }),
          });

          const data = await compiled.json();

          if (!compiled.ok || data.status == "error") {
            log.error(`${data.error}`);
            return data;
          }

          set.status = 200;
          log.info(`Data ${data} compiled.`);
          return data;
        },
        {
          body: t.Object({
            code: t.String(),
          }),
          // WARNING: wasn't able to make it work (fails even when the cookie is present)
          //
          cookie: t.Cookie({
            access_token: t.String(),
          }),
          response: t.Union([
            t.Object({ status: t.Literal("ok") }),
            t.Object({
              status: t.Literal("error"),
              errors: t.Array(t.Any()),
            }),
          ]),
          detail: { tags: ["api"] },
        }
      )
      .post(
        "/test",
        async ({ log, set, body: { code }, cookie }) => {
          const id = decrypt(cookie.access_token.value) as string;
          console.log("id: ", id);

          const user = await prisma.user.findUnique({
            where: {
              id,
            },
            select: {
              email: true,
              id: true,
            },
          });

          if (!user) {
            set.status = 401; // Unauthorized
            log.warn(`User not found: ${id}`);
            return;
          }
          console.log(user);

          // "https://sagittarius-compose-production.up.railway.app/deploy",
          const compiled = await fetch(`${COMPILER_URL}/test`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              source: code,
            }),
          });
          const data = await compiled.json();

          if (!compiled.ok) {
            set.status = compiled.status;
            log.error(`${data.error}`);
            set.status = 400;
            return data.error;
          }

          set.status = 200;
          log.info(`Data ${data} compiled.`);
          return {
            compiled: data,
            user_id: user.id,
          };
        },
        {
          body: t.Object({
            code: t.String(),
          }),
          cookie: t.Cookie({
            access_token: t.String(),
          }),
          detail: { tags: ["api"] },
        }
      )
  )
  .get("/status", async ({ set }) => {
    const statuses = [
      "Single",
      "In a relationship",
      "Married",
      "In love",
      "It's complicated",
    ];
    set.status = 200;
    return statuses[Math.floor(Math.random() * statuses.length)];
  })
  .get("/", async ({ set }) => {
    set.redirect = "/status";
  })
  .listen({ port: "9512", hostname: "0.0.0.0" });

export type Router = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
