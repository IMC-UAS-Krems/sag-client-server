import { Component } from "solid-js";
import { useI18n } from "@solid-primitives/i18n";

import styles from "@styles/Home.module.css";

const Home: Component = () => {
  const [t, { add, locale, dict }] = useI18n();

  return (
    <>
      <main class={styles.mainHomeContainer}>{`${t("Home")} ${t("page")}`}</main>
    </>
  )
};

export default Home;

/*Serve per displayare una mappa con sopra i pin che rappresentano un sistema distribuito iot (es: smart park e se ha un sensore), deve avere un tooltip di infos
infos: position, type of sys (smart coccos), provider, nome attività, (serie di bottoni per ricevere cose)

Inserire tutte le route in route protetta tramite isAllowed()

aggiungere router dello user

about us -> roba di uni (Nino manda il paper)

integrare sia light che dark mode
 */
