import { Elysia, t } from "elysia";

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

export type ReturnUser = Omit<UserDocument, "password" | "id">;

export const auth = new Elysia({ prefix: "/auth" })
  .post(
    "/register",
    async ({
      jwt,
      log,
      set,
      body: { name, email, username, key, municipalityName, organizationName },
      cookie: { jwtToken },
    }: AuthContextWithBody<RegisterBody>): Promise<RegisteredUser | { error: string }> => {
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

        // Remove the password and id from the user object on purpose
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, password, ...user } = userResult;
        const sessionDuration =
          Number(Bun.env.VITE_COOKIES_EXPIRATION) || panic("VITE_COOKIES_EXPIRATION environment variable not set");

        jwtToken.set({
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/", // default
          maxAge: sessionDuration,
          value: await jwt.sign({ userId: id, userRole: user.userRole, email: user.email }),
        });

        log.info(`User ${user.name} registered.`);

        set.status = 201;
        return user as RegisteredUser;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("already exists")) {
            log.warn(error.message);
            set.status = 409; // Conflict
            return { error: error.message };
          }
          log.error(error.message);
          set.status = 500; // Internal Server Error
          return { error: error.message };
        } else {
          log.error("An unknown error occurred");
          set.status = 500; // Internal Server Error
          return { error: "An unknown error occurred" };
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
        jwtToken: t.Optional(t.String()),
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
      jwt,
      log,
      set,
      body: { identifier, key },
      cookie: { jwtToken },
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
      // Remove the password and id from the user object on purpose
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, password, ...user } = userResult as UserDocument;
      const sessionDuration =
        Number(Bun.env.VITE_COOKIES_EXPIRATION) || panic("VITE_COOKIES_EXPIRATION environment variable not set");

      jwtToken.set({
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/", // default
        maxAge: sessionDuration,
        value: await jwt.sign({ userId: id, userRole: user.userRole, email: user.email }),
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
        jwtToken: t.Optional(t.String()),
      }),
      detail: {
        tags: ["auth"],
        description: "Authenticate and log in a user by setting an access token cookie",
      },
    },
  )

  .post(
    "/logout",
    async ({ log, set, cookie: { jwtToken }, userId }: AuthContextWithRequest) => {
      if (!userId || !jwtToken) {
        set.status = 401;
        return { error: "User not logged in" };
      }

      jwtToken.set({
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
      return { success: true, message: "User logged out successfully" };
    },
    {
      cookie: t.Cookie({
        jwtToken: t.Optional(t.String()),
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
        return { error: "User not logged in" };
      }
      set.status = 200;
      return { name: user.name, email: user.email, userRole: user.userRole };
    },
    {
      cookie: t.Cookie({
        jwtToken: t.Optional(t.String()),
      }),
      detail: {
        tags: ["auth"],
        description:
          "Check if the cookie from the request contains an access token and returns the user's name, email and role",
      },
    },
  )

  .get(
    "/check-if-must-logout",
    async ({ set, userId, cookie: { jwtToken } }: AuthContextWithRequest) => {
      if (!userId) {
        set.status = 401;
        return { error: "User not logged in" };
      }

      const user = await sql.selectUser(userId);
      if (user == null) {
        set.status = 401;
        jwtToken.set({
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
        jwtToken.set({
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
        jwtToken: t.Optional(t.String()),
      }),
      detail: {
        tags: ["auth"],
        description: "Check if the user must log out",
      },
    },
  );
