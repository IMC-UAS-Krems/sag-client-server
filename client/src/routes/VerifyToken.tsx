import { Component, onMount, createSignal } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";

import { eden } from "@client/api/index.ts";
import authStore from "@client/store/authStore.ts";
import Header from "@client/components/Header.tsx";
import styles from "@styles/Unauthorized.module.css";

const VerifyToken: Component = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = createSignal<boolean>(true);
  const [verificationResult, setVerificationResult] = createSignal<string | null>(null);

  const verifyEmail = async (token: string) => {
    try {
      const result = await eden.auth["verify-email"].post({
        token: token,
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "POST",
        },
      });
      if (result.status !== 200) {
        setVerificationResult(result.data?.error || "Error verifying token");
        setLoading(false);
        return;
      } else {
        setVerificationResult("You have successfully verified your email");
        setLoading(false);
        authStore.setState({
          ...authStore.state(),
          verified: true,
        });
      }
    } catch (error) {
      let errorMessage = "Error verifying email";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setVerificationResult(errorMessage);
      setLoading(false);
    }
  };

  onMount(() => {
    verifyEmail(useParams().token);
  });

  return (
    <Header>
      <div class={styles["main-container"]}>
        <div class={styles.card}>
          <h1>Email verification</h1>
          {loading() ? (
            <>
              <div class={styles.loader}></div>
              <p>Verifying email...</p>
            </>
          ) : (
            <>
              <p>{verificationResult()}</p>
              {verificationResult() === "You have successfully verified your email" ||
              verificationResult()?.includes("already verified") ? (
                <button onClick={() => navigate("/home")} class={styles["unauth-button"]}>
                  Go back to home page
                </button>
              ) : (
                <button onClick={() => navigate("/verify")} class={styles["unauth-button"]}>
                  Get a new verification link
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Header>
  );
};

export default VerifyToken;
