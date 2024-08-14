import { sql } from "./sql";
import { Context } from "elysia";

// custom context to deal with middleware
interface CustomContext extends Context {
  set: any;
  userId: string | null;
}

export const authMiddleware = async ({
  set,
  userId,
}: CustomContext): Promise<{ status: string; error: string } | undefined> => {
  if (!userId) {
    set.status = 401;
    return { status: "error", error: "Unauthorized" };
  }

  const user = await sql.selectUser(userId);
  if (!user) {
    set.status = 401;
    return { status: "error", error: "Unauthorized" };
  }

  // Check if user must be logged out
  const now = new Date();
  //! Session duration 2 days
  const sessionDuration = 60 * 60 * 24 * 2 * 1000;

  if (now.getTime() - user.lastLoginTime.getTime() > sessionDuration || user.eedsToBeLoggedOut) {
    set.status = 401;
    return { status: "error", error: "Session expired, login again" };
  }
  // update last login time
  await sql.updateUser(user.id, { lastLoginTime: now });

  (set as any).user = user;

  return;
};
