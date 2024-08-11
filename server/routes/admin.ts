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
    },
  )

  .post(
    "/update-user",
    async ({log, set, body}: {log: any; set: any; body: UpdateUserRequestBody}) => {
      try{
        log.info("Trying to update user");
        const user = await sql.updateUser(
          body.userId, 
          body.username, 
          body.password, 
          body.name, 
          body.email, 
          body.organisation, 
          body.municipality, 
          body.userRole);
        if (!user) {
          throw new Error("User not fount during update");
        }
        set.status = 200;
        return user;
      }catch(error){
        log.error(error);
        set.status = 500;
        return {error: "Failed to update user"};
      }},
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
      }
    ),
  },
);