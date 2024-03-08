import { createSignal } from "solid-js";

interface AuthStore {
  isAuthenticated: boolean;
  user: string;
}

const createAuthStore = () => {
  const [state, setState] = createSignal<AuthStore>({
    isAuthenticated: false,
    user: "",
  });

  return {
    state,
    setState
  };
};

const authStore = createAuthStore();

export default authStore;