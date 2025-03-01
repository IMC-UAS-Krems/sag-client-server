import { Context } from "elysia";

// import { panic } from "@utils/panic";
import { sql } from "./sql.ts";

interface CustomContext {
  set: Context["set"];
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
  } catch (error) {
    console.error("Error in authMiddleware:", error);
    set.status = 500;
    return { error: "Internal Server Error" };
  }
};
