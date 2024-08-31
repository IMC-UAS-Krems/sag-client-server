import { Component } from "solid-js";

import Header from "@client/components/Header";
import styles from "@styles/Unauthorized.module.css";

const Unauthorized: Component = () => {
  return (
    <Header>
      <div class={styles["main-container"]}>
        <div class={styles.card}>
          <h1>Unauthorized, Only for admins</h1>
          <button onClick={() => window.history.back()}>Go back</button>
        </div>
      </div>
    </Header>
  );
};

export default Unauthorized;
