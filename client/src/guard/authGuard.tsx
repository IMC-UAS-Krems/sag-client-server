import { useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import authStore from "@store/authStore";

const AuthGuard = (props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    console.log("AuthGuard: Initializing auth");

    await authStore.initializeAuth();
    console.log("AuthGuard: Auth initialized", authStore);

    const { isAuthenticated, userRole } = authStore.state();
    const currentPath = window.location.pathname;

    console.log("AuthGuard: currentPath =", currentPath);
    console.log("AuthGuard: isAuthenticated =", isAuthenticated);
    console.log("AuthGuard: userRole =", userRole);

    if (isAuthenticated && currentPath === "/sign-in") {
      console.log("AuthGuard: Already authenticated, redirecting to the home");
      navigate("/home", { replace: true });
    } else if (!isAuthenticated && currentPath !== "/sign-in") {
      console.log("AuthGuard: Redirecting to /sign-in");
      navigate("/sign-in", { replace: true });
    } else if (props.role && userRole !== props.role) {
      console.log("AuthGuard: Redirecting to /unauthorized");
      navigate("/unauthorized", { replace: true });
    } else {
      setLoading(false);
    }
  });

  return <Show when={!loading()}>{props.children}</Show>;
};

export default AuthGuard;
