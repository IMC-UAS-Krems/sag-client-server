import { sql } from "./sql";
import { decrypt } from "./routes/auth";

interface CustomContext {
  set: any;
  cookie?: { access_token?: { value?: string } }; 
}

export const authMiddleware = async (
  { set, cookie }: CustomContext,
  options = { requireAdmin: false },
): Promise<void | { error: string }> => {
  // idk why is returning access_token value as string === "undefined"
  console.log("Detailed cookie in authMiddleware:", JSON.stringify(cookie, null, 2));

  if (
    !cookie ||
    !cookie.access_token ||
    !cookie.access_token.value ||
    cookie.access_token.value === "undefined"
    
  ) {
    console.log("cookie in authMiddleware:", cookie);
    console.warn("Unauthorized: No token provided or cookie is missing");
    set.status = 401;
    return { error: "Unauthorized: No token provided or cookie is missing" };
  }

  const accessToken = cookie.access_token.value;
  console.log("accessToken in authMiddleware:", accessToken);

  try {
    
    const userId = decrypt(accessToken);
    console.log("userId in authMiddleware:", userId);

    if (!userId) {
      console.error("Unauthorized: Failed to decrypt token");
      set.status = 401;
      return { error: "Unauthorized: Invalid token" };
    }

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
      set.status = 401;
      return { error: "Session expired, please log in again" };
    }

    // Update last login time
    await sql.updateUser(user.id, {
      lastLoginTime: now,
      needsToBeLoggedOut: false,
    });

    // Attach user to context
    (set as any).user = user;
  } catch (error) {
    console.error("Error in authMiddleware:", error);
    set.status = 500;
    return { error: "Internal Server Error" };
  }
};