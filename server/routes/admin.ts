import { authMiddleware } from "@server/middleware";
import { Elysia, t } from "elysia";

export const admin = new Elysia({ prefix: "/admin" }).guard(
  {
    beforeHandle: authMiddleware,
  },
  (app) =>
    app.get(
      "/users",
      async ({ set, userId }) => {
        set.status = 200;
        return "Users";
      },
      { detail: { tags: ["admin"] } },
    ),
);
