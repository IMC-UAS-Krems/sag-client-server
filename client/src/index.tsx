/* @refresh reload */
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { render } from "solid-js/web";
import "./styles/index.css";
import App from "./App";
import { Router } from "@solidjs/router";
// import { I18nContext } from "@solid-primitives/i18n";
// import context from "@store/i18n";

const root = document.getElementById("root");

if (!root || (import.meta.env.DEV && !(root instanceof HTMLElement))) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(
  () => (
    // <I18nContext.Provider value={context.context}>
    <Router>
      <App />
    </Router>
    // </I18nContext.Provider>
  ),
  root
);
