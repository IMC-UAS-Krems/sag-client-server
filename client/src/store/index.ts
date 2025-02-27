import { User } from "@prisma/client";
import { createSignal } from "solid-js";
import { createStoredSignal } from "@utils/storageSignal.ts";

export type UserState = {
  user: User | null;
};

export type Error = {
  line_start: number;
  line_end: number;
  column_start: number;
  column_end: number;
  error: string;
};

export const [errors, setErrors] = createSignal<Error[]>([]);

export const [user, setUser] = createSignal<UserState>({ user: null });

export type JWTState = {
  token: string | null;
};

export const [jwt, setJWT] = createSignal<JWTState>({ token: null });

const [theme, setTheme] = createStoredSignal<string>("theme", "system");

export { theme, setTheme };
