import type { Component } from "solid-js";

import logo from "./logo.svg";
import styles from "./App.module.css";

import { Routes, Route, A } from "@solidjs/router";
import { Button, Link } from "@kobalte/core";
import { Suspense } from "solid-js";
import { createResource } from "solid-js";

import About from "./routes/About";
import Editor from "./routes/Editor";
import Home from "./routes/Home";

import { eden } from "@client/rpc";
import { createSignal } from 'solid-js';

import { translate, locale } from './i18nConfig'
import { Facet } from "@codemirror/state";

const getMessage = async (): Promise<string | null> => {
  const mes = (await eden.index.get()).data;

  console.log("Got a message: ", mes);

  const compile = await eden.compile.post({ file: "hello" });

  return compile.data;
};

function redirect(hrefPath: string) {
  window.location.href = hrefPath;
}


const App = () => {
  const [message] = createResource(getMessage);
  const [isEnglish, setIsEnglish] = createSignal(true); // Track the current language

  // Function to toggle between English and German
  const toggleLanguage = () => {
    const newLocale = isEnglish() ? 'de' : 'en';
    locale(newLocale);
    setIsEnglish(!isEnglish());
  };

  return (
    <>
      <nav>
        <button class={styles.viewsName} onClick={() => redirect('/')}>{translate('Home')}</button>
        <button class={styles.viewsName} onClick={() => redirect('/editor')}>{translate('Editor')}</button>
        <button class={styles.viewsName} onClick={() => redirect('/about')}>{translate('About')}</button>
        <button class={styles.translate} onClick={toggleLanguage}>
          {isEnglish() ? 'DE' : 'EN'}
        </button>
      </nav>
      <Routes>
        <Route path="/" component={Home} />
        <Route path="/editor" component={Editor} />
        <Route path="/about" component={About} />
      </Routes>
      <Suspense fallback={<div>Loading...</div>}>
      </Suspense>
    </>
  );
};

export default App;