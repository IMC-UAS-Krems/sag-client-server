import { type Signal } from "solid-js";
import { createSignal, createComputed } from "solid-js";

export const createStoredSignal = <T>(
	key: string,
	initialValue: T,
): Signal<T> => {
	const [value, setValue] = createSignal<T>(initialValue);

	createComputed(() => {
		const storedValue = localStorage.getItem(key);
		if (storedValue) {
			setValue(JSON.parse(storedValue));
		}
	});

	createComputed(() => {
		localStorage.setItem(key, JSON.stringify(value()));

		return value();
	});

	return [value, setValue];
};
