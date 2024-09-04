import { Elysia, t } from "elysia";
import { sql } from "@server/sql";
import { UserRole } from "@server/prisma";
import { authMiddleware } from "@server/middleware";

interface UpdateUserRequestBody {
  userId: string;
  username?: string;
  password?: string;
  name?: string;
  email?: string;
  organization?: string;
  municipality?: string;
  userRole?: UserRole;
}

interface LogoutUserRequestBody {
  userId: string;
}

export const admin = new Elysia({ prefix: "/admin" })
  .onBeforeHandle(async ({ set, cookie }) => {
    return await authMiddleware({ set, cookie }, { requireAdmin: true });
  })
  .get(
    "/users",
    async ({ set }) => {
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

  // .delete(
  //   "/delete-user",
  //   async ({ log, set, body: { userId } }) => {
  //     try {
  //       log.info("Trying to delete user");
  //       const user = await sql.deleteUser(userId);
  //       set.status = 200;
  //       return user;
  //     } catch (error) {
  //       log.error(error);
  //       set.status = 500;
  //       return { error: "Failed to delete user" };
  //     }
  //   },
  //   {
  //     detail: {
  //       tags: ["admin"],
  //       description: "Delete a user from the database by ID",
  //     },
  //     body: t.Object({
  //       userId: t.String(),
  //     }),
  //   },
  // )

  .delete(
    "/delete-user",
    async ({ log, set, body: { userId } }) => {
      try {
        log.info("Trying to delete user");
        await sql.deleteUser(userId);
        set.status = 200;
        return { message: "User deleted successfully" };
      } catch (error) {
        log.error(error);

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
    async ({ log, set, body }) => {
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
        return { message: "User created successfully", user };
      } catch (error) {
        console.error("Error in POST /admin/createUser:", error);
        set.status = 500;
        return { error: "Internal Server Error" };
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
    async ({ log, set, query }: { log: any; set: any; query: { userId: string } }) => {
      try {
        log.info("Trying to get user details for user");
        const { userId } = query;
        const user = await sql.getUserDataById(userId);
        if (!user) {
          throw new Error("User not found");
        } else {
          set.status = 200;
          return user;
        }
      } catch (error) {
        log.error(error);
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
    async ({ log, set, body }: { log: any; set: any; body: UpdateUserRequestBody }) => {
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
        return user;
      } catch (error) {
        log.error(error);
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
    async ({ log, set, body }: { log: any; set: any; body: LogoutUserRequestBody }) => {
      log.info(`Request body: ${JSON.stringify(body)}`);
      try {
        const userId = body.userId;

        if (!userId) {
          set.status = 400;
          return { status: "error", message: "User ID is required." };
        }

        const user = await sql.selectUser(userId);

        if (!user) {
          set.status = 404;
          return { status: "error", message: "User not found." };
        }

        if (user.needsToBeLoggedOut) {
          set.status = 400;
          return { status: "error", message: "User is already set to be logged out." };
        }

        await sql.updateUser(userId, {
          needsToBeLoggedOut: true,
        });

        set.status = 200;
        return { status: "success", message: "User logged out successfully." };
      } catch (error) {
        log.error(error);
        set.status = 500;
        return { status: "error", message: "Failed to log out user." };
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
