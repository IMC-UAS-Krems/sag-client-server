import { Elysia, t } from "elysia";
import crypt from "ncrypt-js";

import { panic } from "@utils/panic";
import { UserDocument, sql } from "@server/sql";
import {
  AuthContext,
  AuthContextWithBody,
  AuthContextWithRequest,
  RegisterBody,
  RegisteredUser,
  LoginBody,
} from "@server/types";

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
    }: AuthContextWithBody<RegisterBody>): Promise<RegisteredUser> => {
      try {
        const userRole = "Developer";
        const userResult = await sql.createUser({
          username,
          password: key,
          name,
          email,
          userRole,
          organizationName,
          municipalityName,
        });

        const { id, password, ...user } = userResult;

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

        set.status = 201;
        return user as RegisteredUser;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("already exists")) {
            log.warn(error.message);
            set.status = 409; // Conflict
            throw error;
          }
          log.error(error.message);
          set.status = 500; // Internal Server Error
          throw error;
        } else {
          log.error("An unknown error occurred");
          set.status = 500; // Internal Server Error
          throw new Error("An unknown error occurred");
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
    async ({
      log,
      set,
      body: { identifier, key },
      cookie: { access_token },
    }: AuthContextWithBody<LoginBody>): Promise<ReturnUser | undefined> => {
      // try with email
      let userResult = await sql.selectUser(undefined, identifier, undefined, true);
      if (!userResult) {
        userResult = await sql.selectUser(undefined, undefined, identifier, true);
      }
      if (!userResult) {
        set.status = 401;
        log.warn(`User not found: ${identifier}`);
        return;
      }

      if (userResult.deleted) {
        set.status = 401; // Unauthorized
        log.warn(`User is deleted: ${identifier}`);
        return;
      }

      if (userResult.password !== key) {
        set.status = 401; // Unauthorized
        log.warn(`Invalid password from user: ${identifier}`);
        return;
      }

      // Reset the needsToBeLoggedOut flag
      await sql.updateUser(userResult.id, { needsToBeLoggedOut: false });
      const { id, password, ...user } = userResult as UserDocument;

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
    async ({ log, set, cookie: { access_token }, userId }: AuthContextWithRequest) => {
      if (!userId || !access_token) {
        set.status = 401;
        return { error: "User not logged in" };
      }

      access_token.set({
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/", // default
        value: "",
        expires: new Date(0),
      });

      if (userId) {
        await sql.updateUser(userId, { needsToBeLoggedOut: true });
      }

      log.info("User logged out: " + userId);
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
    async ({ set, userId }: AuthContext) => {
      if (!userId) {
        set.status = 401;
        return { error: "User not logged in" };
      }

      const user = await sql.selectUser(userId);

      if (user == null) {
        set.status = 401;
        return { error: "User not logged in" }; // Return an error message
      }
      set.status = 200;
      return { name: user.name, email: user.email, userRole: user.userRole };
    },
    {
      cookie: t.Cookie({
        access_token: t.Optional(t.String()),
      }),
      detail: {
        tags: ["auth"],
        description: "Check if the cookie from the request contains an access token and returns the user's email",
      },
    },
  )
  .get(
    "/check-if-must-logout",
    async ({ set, userId, cookie: { access_token } }: AuthContextWithRequest) => {
      const user = await sql.selectUser(userId);
      if (user == null) {
        set.status = 401;
        access_token.set({
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          value: "",
          expires: new Date(0),
        });
        return { error: "User not logged in", mustLogOut: true };
      }
      if (user.needsToBeLoggedOut) {
        set.status = 401;
        access_token.set({
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          value: "",
          expires: new Date(0),
        });
        return { error: "User must log out", mustLogOut: true };
      }
      set.status = 200;
      return { name: user.name, email: user.email, userRole: user.userRole, mustLogOut: false };
    },
    {
      cookie: t.Cookie({
        access_token: t.String(),
      }),
      detail: {
        tags: ["auth"],
        description: "Check if the user must log out",
      },
    },
  );
