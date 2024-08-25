import { log } from "console";
import { sql } from "./sql";
import { Context } from "elysia";

interface CustomContext {
  set: any;
  userId: string;
}

export const authMiddleware = async ({ set, userId }: CustomContext): Promise<void> => {
  console.info("Yay authentication middleware is running!");
  console.info("Middleware User ID:", userId);
  console.info("Middleware Set:", set);
  // Check if userId is provided
  if (!userId) {
    console.error("Unauthorized: No user ID provided");
    set.status = 401;
    return { error: "Unauthorized: No user ID provided" };
  }

  try {
    // Fetch user from database
    const user = await sql.selectUser(userId);
    if (!user) {
      console.error("Unauthorized: User not found");
      set.status = 401;
      return { error: "Unauthorized: User not found" };
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
    await sql.updateUser(user.id, { lastLoginTime: now });

    // Attach user to context
    (set as any).user = user;
  } catch (error) {
    console.error("Error in authMiddleware:", error);
    set.status = 500;
    return { error: "Internal Server Error" };
  }

  // Else just return
  console.info("Middleware passed: User is authenticated");
  return
};

export const authAdminMiddleware = async (context: Context) => {
  const { userId, set } = context;

  if (!userId) {
    set.status = 401;
    context.body = { error: "Unauthorized: No user ID provided" };
    return; 
  }

  const user = await sql.selectUser(userId);

  if (!user) {
    set.status = 401;
    context.body = { error: "Unauthorized: User not found" };
    return; 
  }

  // Check if the user is an admin
  if (user.userRole !== "ADMIN") {
    set.status = 403;
    context.body = { error: "Access denied: Admins only" };
    return;
  }

  (set as any).user = user;
};


