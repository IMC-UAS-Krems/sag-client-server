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
      level: "error",
      stream: pretty({ colorize: true }),
    })
  )
  .use(
    cors({
      credentials: true,
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
          cookie,
        }): Promise<UserResult | undefined> => {
          try {
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

            set.status = 201;

            const token = encrypt(id);

            log.info(`Producing token: ${token}`);

            cookie.access_token.value = token;
            cookie.access_token.httpOnly = true;
            cookie.access_token.secure = true;
            cookie.access_token.sameSite = "lax";
            cookie.access_token.path = "/";
            cookie.access_token.domain = ".railway.app";
            cookie.access_token.maxAge = 60 * 60 * 24 * 2; // 2 days

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
            access_token: t.String(),
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
          cookie,
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

          cookie.access_token.value = token;
          cookie.access_token.httpOnly = true;
          cookie.access_token.secure = true;
          cookie.access_token.sameSite = "lax";
          cookie.access_token.path = "/";
          cookie.access_token.domain = ".railway.app";
          cookie.access_token.maxAge = 60 * 60 * 24 * 2; // 2 days

          log.info(`User ${user.name} logged in.`);

          return user;
        },
        {
          body: t.Object({
            identifier: t.String() /** <-- Check for both email and username */,
            key: t.String({ minLength: 8 }),
          }),
          cookie: t.Cookie({
            access_token: t.String(),
          }),
          detail: { tags: ["auth"] },
        }
      )
      .post(
        "/logout",
        async ({ log, set, body, cookie }) => {
          cookie.access_token.remove();
          set.status = 200;
        },
        {
          body: t.Object({}),
          cookie: t.Cookie({
            access_token: t.Object({
              inner: t.String(),
            }),
          }),
          detail: { tags: ["auth"] },
        }
      )
  )
  .group("/admin", (app) => app)
  .group("/api", (app) =>
    app.post(
      "/compile",
      async ({ log, set, body: { code }, cookie }) => {
        // const id = decrypt(cookie.access_token.value.inner) as string;
        //
        // const user = await prisma.user.findUnique({
        //   where: {
        //     id,
        //   },
        //   select: {
        //     email: true,
        //   },
        // });
        //
        // if (!user) {
        //   set.status = 401; // Unauthorized
        //   log.warn(`User not found: ${id}`);
        //   return;
        // }

        const compiled = await fetch(
          "https://sagittarius-compose-production.up.railway.app/deploy",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              source: code,
              app_name: `sagittarius-test-run-deploy-${
                (Math.random() * 2000) << 0
              }`,
            }),
          }
        );

        if (!compiled.ok) {
          set.status = compiled.status;
          log.error(`${compiled.statusText}`);
        }

        const data = await compiled.json();

        set.status = 200;
        log.info(`Data ${data} compiled.`);
        return {
          compiled: data,
        };
      },
      {
        body: t.Object({
          code: t.String(),
        }),
        cookie: t.Cookie({
          access_token: t.Object({
            inner: t.String(),
          }),
        }),
        detail: { tags: ["api"] },
      }
    )
  )
  .listen(Bun.env.PORT ?? panic("PORT environment variable not set"));

export type Router = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
