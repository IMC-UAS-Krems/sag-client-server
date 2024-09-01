import { eden } from "@client/api";
import { createSignal } from "solid-js";

interface AuthStore {
  isAuthenticated: boolean;
  user: string;
  userRole: "USER" | "ADMIN" | "";
}

const createAuthStore = () => {
  const [state, setState] = createSignal<AuthStore>({
    isAuthenticated: false,
    user: "",
    userRole: "",
  });

  let isInitialized = false;

  const setCookie = (name: string, value: string, days: number) => {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = "expires=" + date.toUTCString();

    // TODO: In local development environment, we don't have HTTPS
    // But on production, we should set Secure and HttpOnly flags
    // let cookieString = `${name}=${value};${expires};path=/`;
    // if (window.location.hostname !== "localhost") {
    //   cookieString += ";Secure;HttpOnly;SameSite=None";
    // }
    const cookieString = `${name}=${value};${expires};path=/`;
    document.cookie = cookieString;
  };

  const getCookie = (name: string) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  const deleteCookie = (name: string) => {
    document.cookie = name + "=; Max-Age=-99999999;";
  };

  const loadAuthStateFromCookie = () => {
    const storedAuth = getCookie("authStore");
    if (storedAuth) {
      const parsedAuth = JSON.parse(storedAuth);
      setState(parsedAuth);
      isInitialized = true;
    }
  };

  const saveAuthStateToCookie = (newState: AuthStore) => {
    setCookie("authStore", JSON.stringify(newState), 2); // Cookie expires in 2 days just like access_token
    console.log("saveAuthStateToStorage: newState =", newState);
  };

  const resetAuth = () => {
    // Clear the in-memory state
    setState({
      isAuthenticated: false,
      user: "",
      userRole: "",
    });

    // Remove the auth state from local storage
    deleteCookie("authStore");
    isInitialized = false;
    console.log("resetAuth: Auth state reset", state());
  };

  const initializeAuth = async () => {
    if (isInitialized) return;
    isInitialized = true;

    const storedAuth = getCookie("authStore");
    if (storedAuth) {
      const parsedAuth = JSON.parse(storedAuth);
      setState(parsedAuth);
      if (parsedAuth.isAuthenticated) {
        console.log("initializeAuth: Auth state loaded from storage", parsedAuth);
        return;
      }
    }

    try {
      const response = await eden.auth["check-if-logged-in"].get({ $fetch: { credentials: "include" } });
      console.log("response from backend", response);

      if (response.status === 401 || !response.data || !response.data.email || !response.data.userRole) {
        console.warn("initializeAuth: Unauthorized or incomplete data returned, resetting auth");
        resetAuth();
        return;
      }

      const newState = {
        isAuthenticated: true,
        user: response.data.email,
        userRole: response.data.userRole,
      };
      setState(newState);
      saveAuthStateToCookie(newState);
      console.log("initializeAuth: Auth initialized", state());
    } catch (error) {
      console.error("Failed to initialize authentication:", error);
      resetAuth();
      console.warn("initializeAuth: Failed to initialize auth, resetting auth", state());
    }
  };

  loadAuthStateFromCookie();

  return {
    state,
    setState,
    initializeAuth,
    resetAuth,
  };
};

const authStore = createAuthStore();

export default authStore;
