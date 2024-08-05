import { authMiddleware } from "@server/middleware";
import { Elysia, t } from "elysia";

export const admin = new Elysia({ prefix: "/admin" }).get(
  "/users",
  async ({ set, userId }) => {
    set.status = 200;
    return "Users";
  },
  {
    beforeHandle: authMiddleware,
    detail: { tags: ["admin"] },
  },
);
