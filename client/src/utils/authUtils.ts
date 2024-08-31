import { useNavigate } from "@solidjs/router";

// import { eden } from "@client/api";
// import authStore from "@store/authStore";
import { User } from "@client/types";

export const sessionDuration = 60 * 60 * 24 * 2 * 1000; // 2 days

export async function isUserOnline(user: User): Promise<boolean> {
  const now = new Date().getTime();
  const lastLoginTime = new Date(user.lastLoginTime).getTime();
  return !user.needsToBeLoggedOut && now - lastLoginTime < sessionDuration;
}

export async function handleUnauthorized(navigate: ReturnType<typeof useNavigate>) {
  console.log("Handling unauthorized user");
  // If logged in, log out
  // if (authStore.state().isAuthenticated) {
  //   // Log out, remove cookie
  //   await eden.auth.logout.post({
  //     $fetch: {
  //       mode: "cors",
  //       credentials: "include",
  //       method: "POST",
  //     },
  //   });

  //   // Update auth store
  //   authStore.setState({ isAuthenticated: false, user: "", userRole: "" });
  // }

  // Navigate to the login page
  navigate("/unauthorized");
}
