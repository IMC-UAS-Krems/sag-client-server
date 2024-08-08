import { authMiddleware } from "@server/middleware";
import { Elysia, t } from "elysia";
import { sql } from "@server/sql";
import { Prisma } from "@prisma/client";
import { P } from "@kobalte/core/dist/index-f15c7ba5";

interface CreateUserRequestBody {
  username: string;
  password: string;
  name: string;
  email: string;
  organisation: string;
  municipality: string;
  userRole: UserRole;
}

interface CreateUserResponse {
  id: string;
  username: string;
  name: string;
  email: string;
  organisation: string;
  municipality: string;
  userRole: UserRole;
  registered: Date;
}

export const admin = new Elysia({ prefix: "/admin" })
  .get(
    "/users",
    async ({ set, userId }) => {
      set.status = 200;
      return "Users";
    },
    {
      beforeHandle: authMiddleware,
      detail: { tags: ["admin"] },
    },
  )

  .post(
    "/create-user",
    async ({ log, set, body: { username, password, name, email, organisation, municipality, userRole } }) => {
      const user = await sql.createUser(username, password, name, email, organisation, municipality, userRole);


      if (user === null) {
        throw new Error("User could not be created");
      }
      set.status = 201;
      return user;},
      {
        beforeHandle: authMiddleware,
        detail: { tags: ["admin"] },
    },
  );
