import { sql } from "./sql";
import { Context } from "elysia";

interface CustomContext extends Context {
  set: any;
  userId?: string;
  user?: any;
}

export const authMiddleware = async ({ set, userId }: CustomContext): Promise<void> => {
  // Check if userId is provided
  if (!userId) {
    set.status = 401;
    set.body = { error: "Unauthorized: No user ID provided" };
    return;
  }

  try {
    // Fetch user from database
    const user = await sql.selectUser(userId);
    if (!user) {
      set.status = 401;
      set.body = { error: "Unauthorized: User not found" };
      return;
    }

    // Check session expiration
    const now = new Date();
    const sessionDuration = 60 * 60 * 24 * 2 * 1000; // 2 days
    if (now.getTime() - user.lastLoginTime.getTime() > sessionDuration || user.needsToBeLoggedOut) {
      set.status = 401;
      set.body = { error: "Session expired, please log in again" };
      return;
    }

    // Update last login time
    await sql.updateUser(user.id, { lastLoginTime: now });

    // Attach user to context
    (set as any).user = user;
  } catch (error) {
    console.error("Error in authMiddleware:", error);
    set.status = 500;
    set.body = { error: "Internal Server Error" };
  }
};
