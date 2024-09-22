import { sql } from "./sql";
// import { decrypt } from "./routes/auth";
import { Context, Cookie } from "elysia";

interface CustomContext {
  set: Context["set"] & { user?: object };
  cookie?: Record<"access_token", Cookie<string>>;
  userId: string | null;
}

export const authMiddleware = async (
  { set, cookie, userId }: CustomContext,
  options = { requireAdmin: false },
): Promise<void | { error: string }> => {
  if (!cookie || cookie.access_token.value === "undefined") {
    console.error("Unauthorized: Missing cookie or token");
    set.status = 401;
    return { error: "Unauthorized: Missing token" };
  }

  if (!userId) {
    console.error("Unauthorized: Failed to decrypt token");
    set.status = 401;
    return { error: "Unauthorized: Invalid token" };
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
    const sessionDuration = 60 * 60 * 24 * 2 * 1000; // 2 days
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
