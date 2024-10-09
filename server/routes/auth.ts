import { Elysia, t } from "elysia";

import nodemailer from "nodemailer";

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

import getEmailTemplate from "./emailTemplate";

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
        return { error: "User not logged in" }; // Return an error message
      }
      set.status = 200;
      return { name: user.name, email: user.email, userRole: user.userRole, verified: user.verified };
    },
    {
      cookie: t.Cookie({
        jwtToken: t.Optional(t.String()),
      }),
      detail: {
        tags: ["auth"],
        description: "Check if the cookie from the request contains an access token and returns the user's email",
      },
    },
  )
  .get(
    "/check-if-must-logout",
    async ({ set, userId, cookie: { jwtToken } }: AuthContextWithRequest) => {
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
  )

  .post(
    "/send-verification",
    async ({ jwt, log, set, body }: AuthContextWithBody<{ email: string }>) => {
      // const transporter = nodemailer.createTransport({
      //   host: Bun.env.SMTP_HOST ?? panic("SMTP_HOST environment variable not set"),
      //   port: 587,
      //   auth: {
      //     user: Bun.env.SMTP_USER ?? panic("SMTP_USER environment variable not set"),
      //     pass: Bun.env.SMTP_PASS ?? panic("SMTP_USER environment variable not set"),
      //   },
      //   // logger: true,
      //   // debug: true,
      // });

      // const user = "dfoddav";
      // const verificationLink = "https://www.imc.ac.at/";
      // // Define email options
      // const mailOptions = {
      //   from: '"Sagittarius Team" <hello@demomailtrap.com>', // Sender address
      //   to: body.email, // List of recipients
      //   subject: "Sagittarius - Email Verification", // Subject line
      //   text: `Hello ${user}, please verify your email by clicking the following link: ${verificationLink}`, // Plain text body
      //   html: getEmailTemplate(user, verificationLink), // HTML body
      // };

      // try {
      //   // Send email
      //   const info = await transporter.sendMail(mailOptions);
      //   console.log("Message sent: %s", info.messageId);
      // } catch (error) {
      //   console.error("Error sending email:", error);
      // }

      const verificationToken = jwt.sign({ email: body.email });
      log.info(`Verification token: ${verificationToken}`);
      return verificationToken;
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
      detail: {
        tags: ["auth"],
        description: "Send a verification email to the user",
      },
    },
  )

  .post(
    "/verify-email",
    async ({ jwt, log, set, body }: AuthContextWithBody<{ verificationToken: string }>) => {
      try {
        const verifiedToken = (await jwt.verify(body.verificationToken)) as { email: string };
        if (typeof verifiedToken === "object" && verifiedToken !== null && "email" in verifiedToken) {
          // const jwtToken = verifiedToken as { email: string };
          const user = await sql.verifyUserEmail(verifiedToken.email);
          if (user) {
            set.status = 200;
            log.info(`Email verified: ${verifiedToken}`);
            return { message: "Email succesfully verified" };
          } else {
            set.status = 404;
            return { error: "User with email not found" };
          }
        } else {
          console.warn("JWT verification failed or returned an invalid token.");
        }
      } catch (error) {
        console.error("Failed to verify JWT token:", error);
      }
    },
    {
      body: t.Object({
        token: t.String(),
      }),
      detail: {
        tags: ["auth"],
        description: "Try and verify a user's email via a token",
      },
    },
  )

  .get("/user-verification-status", async ({ set, userId }: AuthContext) => {
    if (!userId) {
      set.status = 401;
      return { error: "User not logged in" };
    }

    return { verified: await sql.getUserVerificationStatus(userId) };
  });
