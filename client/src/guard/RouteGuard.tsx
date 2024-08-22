import { useNavigate } from "@solidjs/router";
import { onMount, Component } from "solid-js";
import authStore from "@store/authStore";
import { eden } from "@client/api";

const ProtectedRoute: Component<{ component: Component }> = (props) => {
  const navigate = useNavigate();

  onMount(async () => {
    if (!authStore.state().isAuthenticated) {
      try {
        const response = await eden.auth["check-if-logged-in"].get({
          $fetch: {
            mode: "cors",
            credentials: "include",
            method: "GET",
          },
        });

        if (response.status === 200 && response.data) {
          authStore.setState({
            isAuthenticated: true,
            user: response.data.userId,
            userRole: response.data.userRole,
          });
        } else {
          authStore.setState({ isAuthenticated: false, user: "", userRole: "" });
          navigate("/sign-in");
        }
      } catch (error) {
        console.error("Error checking authentication status", error);
        authStore.setState({ isAuthenticated: false, user: "", userRole: "" });
        navigate("/sign-in");
      }
    }
  });

  return authStore.state().isAuthenticated ? <props.component /> : null;
};

export default ProtectedRoute;
