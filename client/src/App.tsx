import type { Component } from "solid-js";

import Header from "./components/Header";
import DRoutes from "./components/DRoutes";

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
      <Header />
      <DRoutes />
    </>
  );
};

export default App;
