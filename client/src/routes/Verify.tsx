import { Component } from "solid-js";
import { useNavigate } from "@solidjs/router";

import Swal from "sweetalert2";

import { eden } from "@client/api";
import Header from "@client/components/Header";
import authStore from "@store/authStore";
import styles from "@styles/Unauthorized.module.css";

const Verify: Component = () => {
  const navigate = useNavigate();
  const verified = authStore.state().verified;

  const sendVerificationEmail = async () => {
    try {
      const result = await eden.auth["send-verification"].post({
        email: authStore.state().email,
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "POST",
        },
      });
      console.log("Verification email sent:", result);
      Swal.fire({
        icon: "success",
        title: "Verification email sent",
        text: "Please check your email for the verification link",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error sending verification email",
        text: error.message,
      });
    }
  };

  return (
    <Header>
      <div class={styles["main-container"]}>
        {verified ? (
          <div class={styles.card}>
            <h1>You have already verified your email</h1>
            <button onClick={() => navigate("/home")}>Go back to home page</button>
          </div>
        ) : (
          <div class={styles.card}>
            <h1>You have not verified your email yet, please verify it</h1>
            <button onClick={sendVerificationEmail}>Send verification email</button>
          </div>
        )}
      </div>
    </Header>
  );
};

export default Verify;
