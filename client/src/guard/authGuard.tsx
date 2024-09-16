import { useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show, onCleanup } from "solid-js";
import authStore from "@store/authStore";

const checkInterval = 30000; // 30 seconds

const AuthGuard = (props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = createSignal(true);
  let intervalId;

  const roleMapping = {
    Administrator: "ADMIN",
    Manager: "USER",
    Developer: "USER",
  };

  const checkAuth = async () => {
    try {
      await authStore.initializeAuth();
      const { isAuthenticated, userRole } = authStore.state();
      const currentPath = window.location.pathname;
      const requiredRole = props.role;

      const mappedUserRole = roleMapping[userRole];

      if (!isAuthenticated && currentPath !== "/sign-in") {
        authStore.resetAuth();
        navigate("/sign-in", { replace: true });
      } else if (requiredRole && mappedUserRole !== requiredRole) {
        navigate("/unauthorized", { replace: true });
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("AuthGuard: Error checking authentication", error);
      authStore.resetAuth();
      navigate("/sign-in", { replace: true });
    }
  };

  const startAuthCheckInterval = () => {
    intervalId = setInterval(async () => {
      console.log("Checking auth status");
      try {
        await authStore.initializeAuth();
        if (!authStore.state().isAuthenticated) {
          console.log("Session expired or logged out");
          authStore.resetAuth();
          navigate("/sign-in", { replace: true });
        }
      } catch (error) {
        console.warn("Periodic auth check failed:", error);
        authStore.resetAuth();
        navigate("/sign-in", { replace: true });
      }
    }, checkInterval);
  };

  onMount(() => {
    checkAuth();
    startAuthCheckInterval();
  });

  onCleanup(() => {
    if (intervalId) clearInterval(intervalId); // Clear interval on component unmount
  });

  return <Show when={!loading()}>{props.children}</Show>;
};

export default AuthGuard;
