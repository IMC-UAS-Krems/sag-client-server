import { User } from "@prisma/client";
import { createSignal } from "solid-js";
import { createStoredSignal } from "@utils/storageSignal";

export type UserState = {
	user: User | null;
};

export const [user, setUser] = createSignal<UserState>({ user: null });

export type JWTState = {
	token: string | null;
};

export const [jwt, setJWT] = createSignal<JWTState>({ token: null });

const [theme, setTheme] = createStoredSignal<string>("theme", "light");

export { theme, setTheme };
