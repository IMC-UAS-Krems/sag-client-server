import type { Component } from "solid-js";
import DRoutes from "./components/DRoutes.tsx";
import { Toaster } from "@client/components/ui/toast.tsx";
import { EditorProvider } from "./contexts/editor.tsx";

const App: Component = () => {
  // const [message] = createResource(getMessage);
  // const [t, { add, locale, dict }] = useI18n();

  // Function to toggle between English and German
  // const toggleLanguage = () => {
  //   const newLocale = locale() === "en" ? "de" : "en";
  //   locale(newLocale);
  // };
  // TODO: change EditorProvider scope (probably is not needed for the entire app)
  return (
    <>
      <EditorProvider>
        <DRoutes />
        <Toaster />
      </EditorProvider>
    </>
  );
};

export default App;
