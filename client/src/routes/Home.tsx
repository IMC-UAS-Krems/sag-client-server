import { Component } from "solid-js";
import { useI18n } from "@solid-primitives/i18n";

const Home: Component = () => {
	const [t, { add, locale, dict }] = useI18n();

	return <div>{`${t("Home")} ${t("page")}`}</div>;
};

export default Home;
