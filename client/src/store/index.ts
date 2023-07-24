import { User } from "@prisma/client";
import { createSignal } from "solid-js";

export type UserState = {
	user: User | null;
};

export const [user, setUser] = createSignal<UserState>({ user: null });

export type JWTState = {
	token: string | null;
};

export const [jwt, setJWT] = createSignal<JWTState>({ token: null });
