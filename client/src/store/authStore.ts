import { createSignal } from "solid-js";

interface AuthStore {
  isAuthenticated: boolean;
  user: string;
}

const createAuthStore = () => {
  const [state, setState] = createSignal<AuthStore>({
    isAuthenticated: false,
    user: "",
    // TODO: There should also be a status field here to indicate if user is admin or not
  });

  return {
    state,
    setState,
  };
};

const authStore = createAuthStore();

export default authStore;
