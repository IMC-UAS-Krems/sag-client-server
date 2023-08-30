import type { Component } from "solid-js";

import logo from "./logo.svg";
import styles from "@styles/App.module.css";

import { Routes, Route, A } from "@solidjs/router";
import { Button, Link } from "@kobalte/core";
import { Suspense } from "solid-js";
import { createResource } from "solid-js";

import About from "@routes/About";
import Editor from "@routes/Editor";
import Home from "@routes/Home";
import SignIn from "./routes/SignIn";
import { user, setUser } from "@store/index";
import { eden } from "@client/api";
import { createSignal } from "solid-js";
import { useI18n } from "@solid-primitives/i18n";
import { Facet } from "@codemirror/state";

const getMessage = async (): Promise<string | null> => {
	const mes = (await eden.api.hello.get()).data;

	console.log("Got a message: ", mes);

	const compile = await eden.api.compile.post({ code: "hello" });

	return compile.data;
};

const App: Component = () => {
	const [message] = createResource(getMessage);
	const [t, { add, locale, dict }] = useI18n();

	// Function to toggle between English and German
	const toggleLanguage = () => {
		const newLocale = locale() === "en" ? "de" : "en";
		locale(newLocale);
	};

	return (
		<>
			<nav>
				<A class={styles.link} href="/">
					{t("Home")}
				</A>
				<A class={styles.link} href="/editor">
					{t("Editor")}
				</A>
				<A class={styles.link} href="/about">
					{t("About")}
				</A>
				<A class={styles.link} href="/signin">
					Sign In
				</A>
				<Button.Root class={styles.translate} onClick={toggleLanguage}>
					{locale()}
				</Button.Root>
			</nav>
			<Routes>
				<Route path="/" component={Home} />
				<Route path="/editor" component={Editor} />
				<Route path="/about" component={About} />
				<Route path="/signin" component={SignIn} />
			</Routes>
			<Suspense fallback={<div>Loading...</div>}>{}</Suspense>
		</>
	);
};

export default App;
