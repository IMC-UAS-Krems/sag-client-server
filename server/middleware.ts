import { panic } from "@utils/panic";
import { sql } from "./sql";
import { Context } from "elysia";

interface CustomContext {
  set: Context["set"] & { user: object };
  userId: string;
}

export const authMiddleware = async (
  { set, userId }: CustomContext,
  options = { requireAdmin: false },
): Promise<void | { error: string }> => {
  if (!userId) {
    console.error("Unauthorized: Missing userId in context");
    set.status = 401;
    return { error: "Unauthorized: Missing userId in context" };
  }

  try {
    const user = await sql.selectUser(userId);
    if (!user) {
      console.error("Unauthorized: User not found");
      set.status = 401;
      return { error: "Unauthorized: User not found" };
    }

    if (options.requireAdmin && user.userRole !== "Administrator") {
      console.warn("Access denied: Admins only");
      set.status = 403;
      return { error: "Access denied: Admins only" };
    }

    // Check session expiration
    const now = new Date();
    const sessionDuration = Number(Bun.env.VITE_COOKIES_EXPIRATION) * 1000 * 60 * 60 || panic("VITE_COOKIES_EXPIRATION environment variable not set");
    if (now.getTime() - user.lastLoginTime.getTime() > sessionDuration || user.needsToBeLoggedOut) {
      console.error("Session expired, please log in again");
      // clear token
      set.headers = {
        "Set-Cookie": `access_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict;`,
      };
      set.status = 401;
      return { error: "Session expired, please log in again" };
    }

    // Update last login time
    await sql.updateUser(user.id, {
      lastLoginTime: now,
      needsToBeLoggedOut: false,
    });

    // Attach user to context
    set.user = user;
  } catch (error) {
    console.error("Error in authMiddleware:", error);
    set.status = 500;
    return { error: "Internal Server Error" };
  }
};
