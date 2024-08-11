import { sql } from "./sql";
import { Context } from "elysia";

// custom context to deal with middleware
interface CustomContext extends Context {
  set: any;
  userId: string | null;
}

export const authMiddleware = async ({ set, userId }: CustomContext): Promise<{ status: string; error: string; } | undefined> => {
  if (!userId) {
    set.status = 401;
    return { status: "error", error: "Unauthorized" };
  }

  const user = await sql.selectUser(userId);
  if (!user) {
    set.status = 401;
    return { status: "error", error: "Unauthorized" };
  }
};
