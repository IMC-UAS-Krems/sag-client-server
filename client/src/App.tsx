import type { Component } from "solid-js";

import logo from "./logo.svg";
import styles from "./App.module.css";

import { Routes, Route } from "@solidjs/router";
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
    <Routes>
      <Route path="/" component={Home} />
      <Route path="/editor" component={Editor} />
      <Route path="/about" component={About} />
      <div class={styles.App}>
        <header class={styles.header}>
          <img src={logo} class={styles.logo} alt="logo" />
          <p>
            <Suspense fallback={<p>Loading...</p>}>
              Edit <code>src/App.tsx</code> and save to reload.
              {message() ?? "Not found"}
            </Suspense>
          </p>
          <a
            class={styles.link}
            href="https://github.com/solidjs/solid"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn Solid
          </a>
        </header>
      </div>
    </Routes>
  );
};

export default App;
