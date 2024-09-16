import { eden } from "@client/api";
import { createSignal } from "solid-js";

interface AuthStore {
  isAuthenticated: boolean;
  user: string;
  userRole: "Developer" | "Manager" | "Administrator" | "";
}

const createAuthStore = () => {
  const [state, setState] = createSignal<AuthStore>({
    isAuthenticated: false,
    user: "",
    userRole: "",
  });

  const setCookie = (name: string, value: string, days: number) => {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = "expires=" + date.toUTCString();
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
    const accessToken = getCookie("access_token"); 
    if (!accessToken) {
      console.log("loadAuthStateFromCookie: No access token found in cookie, resetting auth");
      resetAuth(); 
      return;
    }

    const storedAuth = getCookie("authStore");
    if (storedAuth) {
      const parsedAuth = JSON.parse(storedAuth);
      setState(parsedAuth);
    } else {
      console.log("loadAuthStateFromCookie: No auth state found in cookie, resetting auth");
      resetAuth();
    }
  };

  const saveAuthStateToCookie = (newState: AuthStore) => {
    setCookie("authStore", JSON.stringify(newState), 2);
    console.log("saveAuthStateToStorage: newState =", newState);
  };

  const resetAuth = () => {
    setState({
      isAuthenticated: false,
      user: "",
      userRole: "",
    });
    deleteCookie("authStore");
    console.log("resetAuth: Auth state reset", state());
  };

  const initializeAuth = async () => {
  
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
        user: response.data.email,
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
