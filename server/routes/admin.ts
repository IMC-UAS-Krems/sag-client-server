import { authMiddleware } from "@server/middleware";
import { Elysia, t } from "elysia";
import { sql } from "@server/sql";
import { UserRole } from "@server/prisma";

interface CreateUserRequestBody {
  username: string;
  password: string;
  name: string;
  email: string;
  organisation: string;
  municipality: string;
  userRole: UserRole;
}

interface UpdateUserRequestBody {
  userId: string;
  username?: string;
  password?: string;
  name?: string;
  email?: string;
  organisation?: string;
  municipality?: string;
  userRole?: UserRole;
}

interface DeleteUserRequestBody {
  userId: string;
}

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
      detail: { tags: ["admin"] },
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
      detail: { tags: ["admin"] },
    },
  )

  .post(
    "/create-user",
    async ({
      log,
      set,
      body: { username, password, name, email, organisation, municipality, userRole },
    }: {
      log: any;
      set: any;
      body: CreateUserRequestBody;
    }) => {
      const user = await sql.createUser(username, password, name, email, organisation, municipality, userRole);

      if (!user) {
        throw new Error("User could not be created");
      }
      set.status = 201;
      return user;
    },
    {
      beforeHandle: authMiddleware,
      detail: { tags: ["admin"] },
      body: t.Object({
        username: t.String(),
        password: t.String(),
        name: t.String(),
        email: t.String({ format: "email" }),
        organisation: t.String(),
        municipality: t.String(),
        userRole: t.Enum(UserRole),
      }),
    },
  )

  .post(
    "/update-user",
    async ({ log, set, body }: { log: any; set: any; body: UpdateUserRequestBody }) => {
      try {
        log.info("Trying to update user");
        const user = await sql.updateUser(
          body.userId,
          body.username,
          body.password,
          body.name,
          body.email,
          body.organisation,
          body.municipality,
          body.userRole,
        );
        if (!user) {
          throw new Error("User not fount during update");
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
      detail: { tags: ["admin"] },
      body: t.Object({
        userId: t.String(),
        username: t.Optional(t.String()),
        password: t.Optional(t.String()),
        name: t.Optional(t.String()),
        email: t.Optional(t.String({ format: "email" })),
        organisation: t.Optional(t.String()),
        municipality: t.Optional(t.String()),
        userRole: t.Optional(t.Enum(UserRole)),
      }),
    },
  )

  // TODO: Maybe add additional table in the db to track user sessions ?
  .post(
    "/logout-user",
    async ({ log, set, body: { userId }, cookie: { access_token } }) => {
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

        access_token.set({
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          value: "",
          expires: new Date(0), // Set the cookie to expire immediately
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
      
      detail: { tags: ["admin"] },
      body: t.Object({
        userId: t.String(),
      }),
      cookie: t.Cookie({
        access_token: t.String(),
      }),
    },
  );

