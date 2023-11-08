import { Component } from "solid-js";
import { useI18n } from "@solid-primitives/i18n";

const About: Component = () => {
  const [t, { add, locale, dict }] = useI18n();

  return <main>{`${t("About")} ${t("page")}`}</main>;
};

export default About;
