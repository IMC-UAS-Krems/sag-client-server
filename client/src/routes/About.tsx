import { Component } from "solid-js";

import Header from "@client/components/Header.tsx";

const t = (s: string) => s;

const About: Component = () => {
  return (
    <Header>
      <main>{`${t("About")} ${t("page")}`}</main>
    </Header>
  );
};

export default About;
