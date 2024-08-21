import { Elysia, t } from "elysia";
import crypt from "ncrypt-js";
import { panic } from "@utils/panic";
import { UserDocument, sql } from "@server/sql";
import { Prisma } from "@prisma/client";
import { authMiddleware } from "@server/middleware";

export const { encrypt, decrypt } = new crypt(Bun.env.JWT_SECRET ?? panic("JWT_SECRET environment variable not set"));
export type ReturnUser = Omit<UserDocument, "password" | "id">;

export const auth = new Elysia({ prefix: "/auth" })
  .post(
    "/register",
    async ({
      log,
      set,
      body: { name, email, username, key, municipalityName, organizationName },
      cookie: { access_token },
    }): Promise<ReturnUser | undefined> => {
      try {
        log.info("Trying to create user");

        const userRole = "USER";
        const userResult = await sql.createUser({
          username,
          password: key,
          name,
          email,
          userRole,
          organizationName,
          municipalityName,
        });
        if (!userResult) {
          set.status = 409; // Conflict
          log.warn(`Error creating user, user is ${userResult}`);
          return;
        }

        const { id, password, ...user } = userResult;

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
        municipalityName: t.String(),
        organizationName: t.String(),
        // project: t.Optional(t.String()),
      }),
      cookie: t.Cookie({
        access_token: t.Optional(t.String()),
      }),
      detail: {
        tags: ["auth"],
        description: "Register a new user and log them in by setting an access token cookie",
      },
    },
  )

  .post(
    "/login",
    async ({ log, set, body: { identifier, key }, cookie: { access_token } }): Promise<ReturnUser | undefined> => {
      // try with email
      let userResult = await sql.selectUser(undefined, identifier, undefined, true);
      if (!userResult) {
        userResult = await sql.selectUser(undefined, undefined, identifier, true);
      }
      if (!userResult) {
        set.status = 401; // Unauthorized
        log.warn(`User not found: ${identifier}`);
        return;
      }

      if (userResult.password !== key) {
        set.status = 401; // Unauthorized
        log.warn(`Invalid password from user: ${identifier}`);
        return;
      }

      const { password, id, ...user } = userResult as UserDocument;

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
        identifier: t.String({ minLength: 4 }) /** <-- Check for both email and username */,
        key: t.String({ minLength: 8 }),
      }),
      cookie: t.Cookie({
        access_token: t.Optional(t.String()),
      }),
      detail: {
        tags: ["auth"],
        description: "Authenticate and log in a user by setting an access token cookie",
      },
    },
  )

  .post(
    "/logout",
    async ({ log, set, cookie: { access_token } }) => {
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
      detail: {
        tags: ["auth"],
        description: "Log out a user by deleting the access token cookie",
      },
    },
  )

  .get(
    "/check-if-logged-in",
    async ({ log, set, userId }) => {
      const user = await sql.selectUser(userId);
      console.log("user");
      set.status = 200;
      if (user == null) {
        set.status = 401;
      }
      return user.email;
    },
    {
      cookie: t.Cookie({
        access_token: t.Optional(t.String()),
      }),
      beforeHandle: authMiddleware,
      detail: {
        tags: ["auth"],
        description: "Check if the cookie from the request contains an access token and returns the user's email",
      },
    },
  );
