import { createSignal } from "solid-js";

import { eden } from "@client/api";
import { panic } from "@utils/panic";

interface AuthStore {
  isAuthenticated: boolean;
  email: string;
  name: string;
  userRole: "Developer" | "Manager" | "Administrator" | "";
}

const createAuthStore = () => {
  const [state, setState] = createSignal<AuthStore>({
    isAuthenticated: false,
    email: "",
    name: "",
    userRole: "",
  });

  const setCookie = (name: string, value: string) => {
    const sessionDuration = Number(import.meta.env.VITE_COOKIES_EXPIRATION) * 1000 || panic("VITE_COOKIES_EXPIRATION environment variable not set");
    const date = new Date();
    date.setTime(date.getTime() + sessionDuration);
    const expires = "expires=" + date.toUTCString();
    const cookieString = `${name}=${value};${expires};path=/`;
    document.cookie = cookieString;
  };

  const deleteCookie = (name: string) => {
    document.cookie = name + "=; Max-Age=-99999999;";
  };

  const loadAuthStateFromServer = async () => {
    try {
      const response = await eden.auth["check-if-logged-in"].get({ $fetch: { credentials: "include" } });
      console.log("initializeAuth: Response from check-if-logged-in:", response);

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
      };

      setState(newState);
      saveAuthStateToCookie(newState);
      console.log("initializeAuth: Auth initialized", state());
    } catch (error) {
      console.error("initializeAuth: Failed to initialize authentication:", error);
      resetAuth();
      throw error;
    }
  };

  const saveAuthStateToCookie = (newState: AuthStore) => {
    setCookie("authStore", JSON.stringify(newState));
  };

  const resetAuth = () => {
    setState({
      isAuthenticated: false,
      name: "",
      email: "",
      userRole: "",
    });
    deleteCookie("authStore");
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
