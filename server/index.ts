import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cookie } from "@elysiajs/cookie";
import { jwt } from "@elysiajs/jwt";
import { cors } from "@elysiajs/cors";
import { prisma } from "@∆";
import { User, Prisma } from "@prisma/client";

export type ValidationResult<T> = { message: string; data: T | null };

const app = new Elysia()
  .use(
    swagger({
      path: "/docs",
    }),
  )
  .use(
    jwt({
      name: "jwt",
      secret:
        Bun.env.JWT_SECRET ??
        (() => {
          throw new Error("ENV NOT SET");
        })(),
    }),
  )
  .use(cookie())
  .use(cors())
  .group("/auth", (app) =>
    app
      .post(
        "/logout",
        async ({ jwt, cookie, setCookie }): Promise<ValidationResult<User>> => {
          setCookie("access_token", "");


          return { message: "Logged out", data: null };
        },
      )
      .post(
        "/register",
        async ({
          jwt,
          cookie,
          setCookie,
          body,
        }): Promise<ValidationResult<User>> => {
          // Validate user + jwt

          try {
            const user = await prisma.user.create({
              data: {
                username: body.username,
                password: body.password,
                email: body.email,
                name: body.name,
                municipality: body.municipality ? {
                  connect: {
                    name: body.municipality,
                  },
                } : undefined,
                organisation: body.organisation ? {
                  connect: {
                    name: body.organisation,
                  },
                } : undefined,
              },
            });

            const token = await jwt.sign({
              userId: user.id,
            });

            setCookie("access_token", token, {
              httpOnly: true,
              secure: true,
              maxAge: 60 * 60,
              sameSite: "lax",
            });

            return {
              message: `User ${body.username} was registered successfully!`,
              data: user,
            };
          } catch (e) {
            if (
              e instanceof Prisma.PrismaClientKnownRequestError
              //&&
              // e.code === "P2002"
            ) {
              return { message: e.message, data: null };
            }

            console.log(e)

            return { message: "Unknown Error", data: null };
          }
        },
        {
          body: t.Object({
            name: t.String({
              minLength: 2,
            }),
            username: t.String({
              minLength: 4,
            }),
            password: t.String({
              minLength: 8,
            }),
            email: t.String({
              format: "email",
            }),
            municipality: t.Optional(
              t.String({
                minLength: 2,
              }),
            ),
            organisation: t.Optional(
              t.String({
                minLength: 2,
              }),
            ),
          }),
        },
      )
      .post(
        "/login",
        async ({
          jwt,
          cookie,
          setCookie,
          body,
        }): Promise<ValidationResult<User>> => {
          // Validate user + jwt

          try {
            const user = await prisma.user.findUnique({
              where: {
                username: body.username,
              },
            });

            if (!user) {
              return { message: "User not found", data: null };
            }

            if (user.password !== body.password) {
              return { message: "Wrong credentials!", data: null };
            }

            const token = await jwt.sign({
              userId: user.id,
            });

            setCookie("access_token", token, {
              httpOnly: true,
              secure: true,
              maxAge: 60 * 60,
              sameSite: "lax",
            });

            return { message: "Logged in", data: user };
          } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
              return { message: e.message, data: null };
            }
          }

          return { message: "Logged in", data: null };
        },
        {
          body: t.Object({
            username: t.String(),
            password: t.String({
              minLength: 8,
            }),
          }),
        },
      ),
  )
  .group("/api", (app) =>
    app
      .derive(async ({ cookie, jwt, set }): Promise<ValidationResult<User>> => {
        if (!cookie.access_token) {
          set.status = 401;
          return {
            message: "Unauthorized",
            data: null,
          };
        }

        const result = await jwt.verify(cookie.access_token);

        if (!result || !result.userId) {
          set.status = 401;
          return {
            message: "Unauthorized",
            data: null,
          };
        }

        const userId = result.userId;

        const user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
        });

        if (!user) {
          set.status = 401;
          return {
            message: "Unauthorized",
            data: null,
          };
        }

        return {
          message: "Authorized",
          data: user,
        };
      })
      .get("/hello", async ({ cookie, setCookie, jwt, message, data, set }): Promise<string | null> => {
        if (data === null) {
          set.status = 401;
          return null;
        }

        return `Hello ${data.username}!`;
      })
      .post(
        "/compile",
        async ({
          cookie,
          setCookie,
          jwt,
          message,
          data,
          set,
          body,
        }): Promise<string | null> => {
          if (data === null) {
            set.status = 401;
            return null;
          }

          return `Hello ${data.username}. I compiled ${body.code} for you!`;
        },
        {
          body: t.Object({
            code: t.String(),
          }),
        },
      ),
  )
  .listen(3000);

export type Router = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
