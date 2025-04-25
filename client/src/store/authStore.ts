import { createSignal } from "solid-js";

import { eden } from "@client/api/index.ts";

interface AuthStore {
  isAuthenticated: boolean;
  email: string;
  name: string;
  userRole: "Developer" | "Manager" | "Administrator" | "";
  verified: boolean;
}

const createAuthStore = () => {
  const [state, setState] = createSignal<AuthStore>({
    isAuthenticated: false,
    email: "",
    name: "",
    userRole: "",
    verified: false,
  });

  const deleteCookie = (name: string) => {
    document.cookie = name + "=; Max-Age=-99999999;";
  };

  const loadAuthStateFromServer = async () => {
    try {
      const response = await eden.auth["check-if-logged-in"].get({ $fetch: { credentials: "include" } });
      // console.log("initializeAuth: Response from check-if-logged-in:", response);

      if (response.status === 401 || !response.data || !response.data.email || !response.data.userRole) {
        console.log("initializeAuth: Unauthorized or incomplete data returned, resetting auth");
        resetAuth();
        return;
      }

      const newState = {
        isAuthenticated: true,
        email: response.data.email,
        name: response.data.name,
        userRole: response.data.userRole,
        verified: response.data.verified,
      };

      setState(newState);
      // console.log("initializeAuth: Auth initialized", state());
    } catch (error) {
      console.error("initializeAuth: Failed to initialize authentication:", error);
      resetAuth();
      throw error;
    }
  };

  const resetAuth = () => {
    setState({
      isAuthenticated: false,
      name: "",
      email: "",
      userRole: "",
      verified: false,
    });
    deleteCookie("jwtToken");
  };

  const initializeAuth = async () => {
    await loadAuthStateFromServer();
    if (!state().isAuthenticated) {
      return;
    }
  };

  return {
    state,
    setState,
    initializeAuth,
    resetAuth,
  };
};

const authStore = createAuthStore();
export default authStore;
