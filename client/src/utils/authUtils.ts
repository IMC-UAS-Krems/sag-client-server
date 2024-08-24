import { useNavigate } from "@solidjs/router";
import { eden } from "@client/api";
import authStore from "@store/authStore";

export async function handleUnauthorized(navigate: ReturnType<typeof useNavigate>) {
  // If logged in, log out
  if (authStore.state().isAuthenticated) {
    // Log out, remove cookie
    await eden.auth.logout.post({
      $fetch: {
        mode: "cors",
        credentials: "include",
        method: "POST",
      },
    });

    // Update auth store
    authStore.setState({ isAuthenticated: false, user: "", userRole: "" });
  }

  // Navigate to the login page
  navigate("/sign-in");
}
