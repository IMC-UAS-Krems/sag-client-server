import { sql } from "./sql";

export const authMiddleware = async ({ set, userId }) => {
  if (userId == null) {
    set.status = 401;
    return { status: "error", error: "Unauthorized" };
  }
  const user = await sql.selectUser(userId);
  if (user == null) {
    set.status = 401;
    return { status: "error", error: "Unauthorized" };
  }
};
