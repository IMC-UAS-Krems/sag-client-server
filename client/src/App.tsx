import type { Component } from "solid-js";

import logo from "./logo.svg";
import styles from "./App.module.css";

import buttonStyles from "./buttons.module.css";

import { Routes, Route, A } from "@solidjs/router";
import { Button, Link } from "@kobalte/core";
import { Suspense } from "solid-js";
import { createResource } from "solid-js";

import About from "./routes/About";
import Editor from "./routes/Editor";
import Home from "./routes/Home";

import { eden } from "@client/rpc";

const getMessage = async (): Promise<string | null> => {
  const mes = (await eden.index.get()).data;

  console.log("Got a message: ", mes);

  const compile = await eden.compile.post({ file: "hello" });

  return compile.data;
};

const App: Component = () => {
  const [message] = createResource(getMessage);

  return (
    <>
      <nav>
        <A href="/">
          <button class={styles.viewsName}>Home</button>
        </A>
        <A href="/editor">
          <button class={styles.viewsName}>Editor</button>
        </A>
        <A href="/about">
          <button class={styles.viewsName}>About</button>
        </A>
      </nav>
      <Routes>
        <Route path="/" component={Home} />
        <Route path="/editor" component={Editor} />
        <Route path="/about" component={About} />
      </Routes>
      <Suspense fallback={<div>Loading...</div>}>
        <div>{message() ?? "Less"}</div>
      </Suspense>
    </>
  );
};

export default App;
