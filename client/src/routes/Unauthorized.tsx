import { Component } from "solid-js";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert.tsx";
import { Button } from "@client/components/ui/button.tsx";
import { IoAlertCircleOutline } from "solid-icons/io";
import Header from "@client/components/Header.tsx";

const Unauthorized: Component = () => {
  return (
    <Header>
      <div class="flex content-center items-center justify-center h-full mt-20">
        <Alert variant="destructive" class="w-fit">
          <IoAlertCircleOutline class="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <div class="space-y-4 mt-4">
            <AlertDescription class="text-md">You are not authorized to view this site</AlertDescription>
            <AlertDescription>
              <Button onClick={() => window.history.back()}>Go back</Button>
            </AlertDescription>
          </div>
        </Alert>
      </div>
    </Header>
  );
};

export default Unauthorized;
