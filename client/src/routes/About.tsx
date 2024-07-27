import Header from "@client/components/Header";
import { Component } from "solid-js";

const t = (s: string) => s;

const About: Component = () => {
  return (
    <Header>
      <main>{`${t("About")} ${t("page")}`}</main>
    </Header>
  );
};

export default About;
