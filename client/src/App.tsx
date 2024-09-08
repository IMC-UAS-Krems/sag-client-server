import type { Component } from "solid-js";

import DRoutes from "./components/DRoutes";
import { MenuProvider } from "./components/Menu";
import { EditorProvider } from "./routes/Editor";

const t = (s: string) => s;

// const getMessage = async (): Promise<string | null> => {
//   const mes = (await eden.api.hello.get()).data;
//
//   console.log("Got a message: ", mes);
//
//   const compile = await eden.api.compile.post({ code: "hello" });
//
//   return compile.data;
// };

const App: Component = () => {
  // const [message] = createResource(getMessage);
  // const [t, { add, locale, dict }] = useI18n();

  // Function to toggle between English and German
  // const toggleLanguage = () => {
  //   const newLocale = locale() === "en" ? "de" : "en";
  //   locale(newLocale);
  // };
  return (
    <>
      <MenuProvider>
        <EditorProvider>
          <DRoutes />;
        </EditorProvider>
      </MenuProvider>
    </>
  );
};

export default App;
