import { useNavigate } from "@solidjs/router";

import { panic } from "@utils/panic";
import { UserDetails } from "@server/types";

export const sessionDuration = Number(import.meta.env.VITE_COOKIES_EXPIRATION) || panic("VITE_COOKIES_EXPIRATION environment variable not set");

export async function isUserOnline(user: UserDetails): Promise<boolean> {
  const now = new Date().getTime();
  if (!user.lastLoginTime) {
    return false;
  }
  const lastLoginTime = new Date(user.lastLoginTime).getTime();
  return !user.needsToBeLoggedOut && now - lastLoginTime < sessionDuration;
}

export async function handleUnauthorized(navigate: ReturnType<typeof useNavigate>) {
  console.log("Handling unauthorized user");
  navigate("/unauthorized");
}
