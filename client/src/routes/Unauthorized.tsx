import { Component } from "solid-js";
import styles from "@styles/Unauthorized.module.css";

const Unauthorized : Component = () => {
  return (
    <div class={styles.container}>
      <h1 class={styles["heading-warn"]}>Unauthorized, Only for admins</h1>
    </div>
  );
};

export default Unauthorized;