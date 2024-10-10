import { Component, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";

import Swal from "sweetalert2";

import { eden } from "@client/api";
import Header from "@client/components/Header";
import authStore from "@store/authStore";
import styles from "@styles/Unauthorized.module.css";

const Verify: Component = () => {
  const navigate = useNavigate();
  const verified = authStore.state().verified;
  const [loading, setLoading] = createSignal<boolean>(false);
  const [hasSentVerification, setHasSentVerification] = createSignal<boolean>(false);

  const sendVerificationEmail = async () => {
    setLoading(true);
    try {
      const result = await eden.auth["send-verification"].post({
        email: authStore.state().email,
        username: authStore.state().name,
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "POST",
        },
      });
      console.log("Verification email sent:", result);

      if (result.status !== 200) {
        const errorMessage = (result.data as { error: string }).error || "Error sending verification email";
        Swal.fire({
          icon: "error",
          title: "Error sending verification email",
          text: errorMessage,
        });
        setLoading(false);
        return;
      } else {
        Swal.fire({
          icon: "success",
          title: "Verification email sent",
          text: "Please check your email for the verification link",
        });
        setLoading(false);
        setHasSentVerification(true);
      }
    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      Swal.fire({
        icon: "error",
        title: "Error sending verification email",
        text: errorMessage,
      });
      setLoading(false);
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
            <h1>You have not verified your email yet</h1>
            {hasSentVerification() ? (
              <>
                <p>Verification email has been sent to: {authStore.state().email}</p>
                <button onClick={() => navigate("/home")}>Go back to home page</button>
              </>
            ) : loading() ? (
              <div class={styles.loader}></div>
            ) : (
              <>
                <p>Please check your inbox or request a new verification link here</p>
                <button onClick={sendVerificationEmail}>Send verification email</button>
              </>
            )}
          </div>
        )}
      </div>
    </Header>
  );
};

export default Verify;
