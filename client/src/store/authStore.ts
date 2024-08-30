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

  const loadAuthStateFromStorage = () => {
    const storedAuth = localStorage.getItem("authStore");
    if (storedAuth) {
      const parsedAuth = JSON.parse(storedAuth);
      setState(parsedAuth);
      isInitialized = true;
    }
  };

  const saveAuthStateToStorage = (newState: AuthStore) => {
    localStorage.setItem("authStore", JSON.stringify(newState));
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
    localStorage.removeItem("authStore");
    isInitialized = false;
    console.log("resetAuth: Auth state reset", state());
  };

  const initializeAuth = async () => {
    if (isInitialized) return;
    isInitialized = true;

    const storedAuth = localStorage.getItem("authStore");
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
      saveAuthStateToStorage(newState);
      console.log("initializeAuth: Auth initialized", state());
    } catch (error) {
      console.error("Failed to initialize authentication:", error);
      resetAuth();
      console.warn("initializeAuth: Failed to initialize auth, resetting auth", state());
    }
  };


  loadAuthStateFromStorage();

  return {
    state,
    setState,
    initializeAuth,
    resetAuth,
  };
};

const authStore = createAuthStore();

export default authStore;
