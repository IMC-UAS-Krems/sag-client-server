import { authMiddleware } from "@server/middleware";
import { Elysia, t } from "elysia";
import {sql} from "@server/sql";
import { Prisma } from "@prisma/client";
import { P } from "@kobalte/core/dist/index-f15c7ba5";

export const admin = new Elysia({ prefix: "/admin" })
  .post(
    "/create-user",
    async ({
      log,
      set,
      body:{
        username,
        password,
        name,
        email,
        organisation,
        municipality,
        userRole} }) => {
          try {
            const user = await sql.createUser(username, password, name, email, organisation, municipality, userRole)
          } catch (error) {
        }
      }
  )
