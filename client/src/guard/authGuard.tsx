import { createSignal, onMount, Show, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";

import { panic } from "@utils/panic";
import authStore from "@store/authStore";
import { eden } from "@client/api";

const checkInterval =
  Number(import.meta.env.VITE_AUTH_CHECK_INTERVAL) * 1000 ||
  panic("VITE_AUTH_CHECK_INTERVAL environment variable not set");

interface AuthGuardProps {
  role: string | string[];
  children: any;
}

const AuthGuard = (props: AuthGuardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = createSignal(true);
  let intervalId: Timer;
  let mustbeLogOut: boolean = false;

  const checkAuth = async () => {
    await checkIfMustLogOut();

    if (mustbeLogOut) {
      return;
    }

    await authStore.initializeAuth();

    const { isAuthenticated, userRole, verified } = authStore.state();
    const currentPath = window.location.pathname;
    const requiredRoles = Array.isArray(props.role) ? props.role : [props.role];

    if (!isAuthenticated && currentPath !== "/sign-in") {
      authStore.resetAuth();
      navigate("/sign-in", { replace: true });
    } else if (!requiredRoles.includes(userRole)) {
      navigate("/unauthorized", { replace: true });
    } else if (!verified && currentPath !== "/verify") {
      navigate("/verify", { replace: true });
    } else {
      setLoading(false);
    }
  };

  const checkIfMustLogOut = async () => {
    try {
      const response = await eden.auth["check-if-must-logout"].get({ $fetch: { credentials: "include" } });
      // console.log("Response from check-if-must-logout:", response);
      if (response.data?.mustLogOut || response.status === 401) {
        mustbeLogOut = true;
        console.log("Must log out");
        authStore.resetAuth();
        navigate("/sign-in", { replace: true });
        return;
      }
    } catch (error) {
      console.error("Error checking if must log out: ", error);
      authStore.resetAuth();
      navigate("/sign-in", { replace: true });
    }
  };

  const startAuthCheckInterval = () => {
    intervalId = setInterval(async () => {
      console.log("Checking auth status");
      try {
        await checkIfMustLogOut();
        if (mustbeLogOut) {
          clearInterval(intervalId);
          return;
        }

        await authStore.initializeAuth();

        if (!authStore.state().isAuthenticated) {
          console.log("Session expired or logged out");
          authStore.resetAuth();
          clearInterval(intervalId);
          navigate("/sign-in", { replace: true });
        }
      } catch (error) {
        console.warn("Periodic auth check failed:", error);
        authStore.resetAuth();
        clearInterval(intervalId);
        navigate("/sign-in", { replace: true });
      }
    }, checkInterval);
  };

  onMount(() => {
    console.log("Checking auth status on mount and starting interval");
    checkAuth();
    startAuthCheckInterval();
  });

  onCleanup(() => {
    if (intervalId) clearInterval(intervalId); // Clear interval on component unmount
  });

  return <Show when={!loading()}>{props.children}</Show>;
};

export default AuthGuard;
