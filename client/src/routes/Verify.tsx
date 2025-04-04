import { Component, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@client/components/ui/card.tsx";
import { showToast } from "@client/components/ui/toast.tsx";
import { Button } from "@client/components/ui/button.tsx";

import { eden } from "@client/api/index.ts";
import Header from "@client/components/Header.tsx";
import authStore from "@store/authStore.ts";
import { Alert, AlertTitle, AlertDescription } from "@client/components/ui/alert.tsx";
import { IoClose } from "solid-icons/io";
import { TbLoader2 } from "solid-icons/tb";

const Verify: Component = () => {
  const navigate = useNavigate();
  const verified = authStore.state().verified;
  const [loading, setLoading] = createSignal<boolean>(false);
  const [hasSentVerification, setHasSentVerification] = createSignal<boolean>(false);
  const [verificationError, setVerificationError] = createSignal<string | null>(null);

  const sendVerificationEmail = async () => {
    setVerificationError(null);
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
        showToast({
          variant: "error",
          title: "Error",
          description: errorMessage,
        });
        setLoading(false);
        setVerificationError("Failed to send verification email, please try again later");
        return;
      } else {
        showToast({
          variant: "success",
          title: "Verification email sent",
          description: "Please check your emails for the verification link",
        });
        setLoading(false);
        setHasSentVerification(true);
      }
    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast({
        variant: "error",
        title: "Error",
        description: errorMessage,
      });
      setLoading(false);
      setVerificationError("Failed to send verification email, please try again later");
    }
  };

  return (
    <Header>
      <main class="flex content-center items-center justify-center h-full mt-20">
        {verified ? (
          <Card>
            <CardHeader>
              <CardTitle>You are verified</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>You have already verified your email</CardDescription>
            </CardContent>
            <CardFooter>
              <Button variant="link" onClick={() => navigate("/home")}>
                Back to home page
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div class="flex flex-col items-center justify-center gap-2">
            {verificationError() && (
              <Alert variant="destructive">
                <AlertTitle class="font-semibold">Error</AlertTitle>
                <AlertDescription class="mt-5">
                  {verificationError() || "There has been a problem with sending the verification email."}
                </AlertDescription>
                <AlertDescription>Try again later or contact support if the problem persists.</AlertDescription>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setVerificationError(null)}
                  class="absolute right-2 top-2 text-destructive hover:text-destructive/90"
                >
                  <IoClose class="h-0.5 w-0.5" />
                  <span class="sr-only">Close</span>
                </Button>
              </Alert>
            )}
            <Card>
              <CardHeader>
                <CardTitle>You have not verified your email yet</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Please check your inbox or request a new verification link here</CardDescription>
              </CardContent>
              <CardContent>
                {hasSentVerification() ? (
                  <>
                    <CardDescription>Verification email has been sent to: {authStore.state().email}</CardDescription>
                    <Button variant="link" onClick={() => navigate("/home")}>
                      Back to home page
                    </Button>
                  </>
                ) : (
                  <Button onClick={sendVerificationEmail} disabled={loading()}>
                    {loading() && <TbLoader2 class="animate-spin" />}
                    Send verification email
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </Header>
  );
};

export default Verify;
