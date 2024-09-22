import { Elysia, t } from "elysia";

import { sql } from "@server/sql";
import { authMiddleware } from "@server/middleware";
import {
  AuthContext,
  UserDetails,
  AuthContextWithBody,
  AuthContextWithQuery,
  CreateUserBody,
  UpdateUserBody,
} from "@server/types";
import { UserRole } from "@utils/roles";

export const admin = new Elysia({ prefix: "/admin" })
  .onBeforeHandle(async (context) => {
    return await authMiddleware(
      {
        set: context.set,
        userId: context.userId,
      },
      { requireAdmin: true },
    );
  })
  .get(
    "/users",
    async ({ set }: AuthContext): Promise<UserDetails[] | { error: string }> => {
      try {
        const users = await sql.getAllUsers();
        set.status = 200;
        return users;
      } catch (error) {
        set.status = 500;
        return { error: "Failed to fetch users" };
      }
    },
    {
      detail: {
        tags: ["admin"],
        description: "Get all users from the database",
      },
    },
  )

  .delete(
    "/delete-user",
    async ({
      log,
      set,
      body: { userId },
    }: AuthContextWithBody<{ userId: string }>): Promise<{ message: string } | { error: string }> => {
      try {
        log.info("Trying to delete user");
        await sql.deleteUser(userId);
        set.status = 200;
        return { message: "User deleted successfully" };
      } catch (error) {
        log.error(error instanceof Error ? error.message : String(error));

        if (error instanceof Error) {
          switch (error.name) {
            case "UserNotFoundError":
              set.status = 404;
              return { error: error.message };
            case "UserAlreadyDeletedError":
              set.status = 400;
              return { error: error.message };
            default:
              set.status = 500;
              return { error: "Failed to delete user" };
          }
        } else {
          set.status = 500;
          return { error: "An unknown error occurred" };
        }
      }
    },
    {
      detail: {
        tags: ["admin"],
        description: "Delete a user from the database by ID",
      },
      body: t.Object({
        userId: t.String(),
      }),
    },
  )

  .post(
    "/create-user",
    async ({
      log,
      set,
      body,
    }: AuthContextWithBody<CreateUserBody>): Promise<{ message: string } | { error: string }> => {
      try {
        const { username, password, name, email, organizationName, municipalityName, userRole } = body;
        if (!username || !password || !name || !email || !organizationName || !municipalityName || !userRole) {
          set.status = 422;
          return { error: "All fields are required" };
        }

        const user = await sql.createUser({
          username,
          password,
          name,
          email,
          userRole,
          organizationName,
          municipalityName,
        });

        set.status = 201;
        return { message: "User created successfully: " + user };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("already exists")) {
            log.warn(error.message);
            set.status = 409; // Conflict
            return { error: error.message };
          }
          log.error(error.message);
        } else {
          log.error("An unknown error occurred");
        }
        set.status = 500; // Internal Server Error
        return { error: "Failed to create user" };
      }
    },
    {
      detail: {
        tags: ["admin"],
        description: "Create a new user in the database with the provided details",
      },
      body: t.Object({
        username: t.String({ minLength: 4 }),
        password: t.String({ minLength: 8 }),
        name: t.String({ minLength: 4 }),
        email: t.String({ format: "email" }),
        userRole: t.Enum(UserRole),
        organizationName: t.String(),
        municipalityName: t.String(),
      }),
    },
  )

  .get(
    "/user-details",
    async ({ log, set, query }: AuthContextWithQuery<{ userId: string }>): Promise<UserDetails | { error: string }> => {
      try {
        log.info("Trying to get user details for user");
        const { userId } = query;
        const user: UserDetails | null = await sql.getUserDataById(userId);
        // log.info(`User details: ${JSON.stringify(user)}`);
        if (!user) {
          throw new Error("User not found");
        } else {
          set.status = 200;
          return user;
        }
      } catch (error) {
        if (error instanceof Error) {
          log.error(`Error fetching user details: ${error.message}`);
        } else {
          log.error("An unknown error occurred while fetching user details");
        }
        set.status = 500;
        return { error: "Failed to get user" };
      }
    },
    {
      detail: {
        tags: ["admin"],
        description: "Get the details of a user by ID",
      },
      query: t.Object({
        userId: t.String(),
      }),
    },
  )

  .post(
    "/update-user",
    async ({
      log,
      set,
      body,
    }: AuthContextWithBody<UpdateUserBody>): Promise<{ message: string } | { error: string }> => {
      try {
        log.info("Trying to update user");
        log.info(`Request body: ${JSON.stringify(body)}`);
        const user = await sql.updateUser(body.userId, {
          username: body.username,
          password: body.password,
          name: body.name,
          email: body.email,
          organization: body.organization,
          municipality: body.municipality,
          userRole: body.userRole,
        });
        if (!user) {
          throw new Error("User not found during update");
        }
        set.status = 200;
        return { message: "User updated successfully" };
      } catch (error) {
        if (error instanceof Error) {
          log.error(error.message);
          return { error: error.message };
        } else {
          log.error("An unknown error occurred while updating user");
        }
        set.status = 500;
        return { error: "Failed to update user" };
      }
    },
    {
      detail: {
        tags: ["admin"],
        description: "Update the details of a user by ID, only the fields that are provided will be updated",
      },
      body: t.Object({
        userId: t.String(),
        username: t.Optional(t.String({ minLength: 4 })),
        password: t.Optional(t.String({ minLength: 8 })),
        name: t.Optional(t.String({ minLength: 4 })),
        email: t.Optional(t.String({ format: "email" })),
        organization: t.Optional(t.String()),
        municipality: t.Optional(t.String()),
        userRole: t.Optional(t.Enum(UserRole)),
      }),
    },
  )

  .post(
    "/logout-user",
    async ({ log, set, body }: AuthContextWithBody<{ userId: string }>) => {
      log.info(`Request body: ${JSON.stringify(body)}`);
      try {
        const userId = body.userId;

        if (!userId) {
          set.status = 400;
          return { error: "User ID is required." };
        }

        const user = await sql.selectUser(userId);

        if (!user) {
          set.status = 404;
          return { error: "User not found." };
        }

        if (user.needsToBeLoggedOut) {
          set.status = 400;
          return { error: "User is already set to be logged out." };
        }

        await sql.updateUser(userId, {
          needsToBeLoggedOut: true,
        });

        set.status = 200;
        return { message: "User logged out successfully." };
      } catch (error) {
        if (error instanceof Error) {
          log.error(error.message);
        } else {
          log.error("An unknown error occurred while logging out user");
        }
        set.status = 500;
        return { error: "Failed to log out user." };
      }
    },
    {
      detail: {
        tags: ["admin"],
        description: "Log out a user by ID",
      },
      body: t.Object({
        userId: t.String(),
      }),
    },
  );
