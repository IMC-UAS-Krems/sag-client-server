import { Component } from "solid-js";

import Header from "@client/components/Header.tsx";
import styles from "@styles/Unauthorized.module.css";

const Unauthorized: Component = () => {
  return (
    <Header>
      <div class={styles["main-container"]}>
        <div class={styles.card}>
          <h1 class={styles["unauth-h1"]}>You are not authorized for this website</h1>
          <button class={styles["unauth-button"]} onClick={() => window.history.back()}>
            Go back
          </button>
        </div>
      </div>
    </Header>
  );
};

export default Unauthorized;
