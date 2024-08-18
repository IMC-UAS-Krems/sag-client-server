import { authMiddleware } from "@server/middleware";
import { Elysia, t } from "elysia";
import { sql } from "@server/sql";
import { UserRole } from "@server/prisma";

interface CreateUserRequestBody {
  username: string;
  password: string;
  name: string;
  email: string;
  organizationName: string;
  municipalityName: string;
  userRole: UserRole;
}

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

interface DeleteUserRequestBody {
  userId: string;
}

// interface GetUserRequestBody {
//   userId: string;
// }

export const admin = new Elysia({ prefix: "/admin" })
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
      beforeHandle: authMiddleware,
      detail: {
        tags: ["admin"],
        description: "Get all users from the database",
      },
    },
  )

  .delete(
    "/users",
    async ({ log, set, body }: { log: any; set: any; body: DeleteUserRequestBody }) => {
      try {
        log.info("Trying to delete user");
        const { userId } = body;
        const user = await sql.deleteUser(userId);
        set.status = 200;
        return user;
      } catch (error) {
        log.error(error);
        set.status = 500;
        return { error: "Failed to delete user" };
      }
    },
    {
      beforeHandle: authMiddleware,
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
    "/createUser",
    async ({ log, set, body }) => {
      try {
        console.log("Received request to create user with body:", body);

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
      beforeHandle: authMiddleware,
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
    "/update-user",
    async ({ log, set, query }: { log: any; set: any; query: { userId: string } }) => {
      try {
        log.info("Trying to get user details for user");
        const { userId } = query;
        const user = await sql.selectUser(userId);
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
      beforeHandle: authMiddleware,
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
      beforeHandle: authMiddleware,
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
    async ({
      log,
      set,
      body: { userId },
      cookie,
    }: {
      log: any;
      set: any;
      body: { userId: string };
      cookie: { access_token: any };
    }) => {
      try {
        log.info(`Admin attempting to log out user with ID: ${userId}`);

        const user = await sql.selectUser(userId);

        // Ensure that only admins can access this endpoint
        if (!access_token) {
          set.status = 401;
          return { status: "error", message: "Unauthorized" };
        }

        if (user.userRole !== UserRole.ADMIN) {
          set.status = 403;
          return { status: "error", message: "Forbidden for non admins" };
        }

        if (!user) {
          set.status = 404;
          return { status: "error", message: "User not found." };
        }

        await sql.updateUser(
          userId,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true,
        );

        cookie.access_token.set({
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          value: "",
          expires: new Date(0), // st the cookie to expire immediately to log out the user
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
      beforeHandle: authMiddleware,

      detail: {
        tags: ["admin"],
        description: "Log out a user by ID",
      },
      body: t.Object({
        userId: t.String(),
      }),
      cookie: t.Cookie({
        access_token: t.String(),
      }),
    },
  );
