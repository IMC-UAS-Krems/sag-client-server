import { Component, onMount, createSignal } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";

import { eden } from "@client/api/index.ts";
import authStore from "@client/store/authStore.ts";
import Header from "@client/components/Header.tsx";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@client/components/ui/card.tsx";
import { Button } from "@client/components/ui/button.tsx";
import { TbLoader2 } from "solid-icons/tb";

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
      <main class="flex content-center items-center justify-center h-full mt-20">
        <Card>
          <CardHeader>
            <CardTitle>Email Verification</CardTitle>
          </CardHeader>
          <CardContent>
            {loading() ? (
              <div class="flex items-center space-x-2">
                <TbLoader2 class="animate-spin h-6 w-6" />
                <p>Verifying email...</p>
              </div>
            ) : (
              <div class="space-y-4">
                <CardDescription>{verificationResult()}</CardDescription>
                {verificationResult() === "You have successfully verified your email" ||
                verificationResult()?.includes("already verified") ? (
                  <Button onClick={() => navigate("/home")}>Go back to home page</Button>
                ) : (
                  <Button onClick={() => navigate("/verify")}>Get a new verification link</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </Header>
  );
};

export default VerifyToken;
