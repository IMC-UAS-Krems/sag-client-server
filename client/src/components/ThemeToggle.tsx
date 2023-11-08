import { type Component, createSignal, onMount } from "solid-js";
import { Button, Image } from "@kobalte/core";
import { theme, setTheme } from "@store/index";
import { FaSolidSun, FaSolidMoon } from 'solid-icons/fa';

import styles from "@styles/Toggle.module.css";

const ThemeToggle: Component = () => {

  onMount(() => {
    theme() && document.body.classList.add(theme() === "light" ? "lightMode" : "darkMode");

    const themeShiftCheckbox = document.getElementById("themeCheckbox") as HTMLInputElement;

    themeShiftCheckbox.checked = theme() === "light" ? false : true
  })

  const toggleTheme = () => {
    if (document.body.classList.contains("lightMode")) {
      document.body.classList.add("darkMode");
      document.body.classList.remove("lightMode");
    } else {
      document.body.classList.add("lightMode");
      document.body.classList.remove("darkMode");
    }
    setTheme(theme() === "light" ? "dark" : "light");
  }

  return (
    <>
      {/* <Button.Root onClick={() => { toggleTheme() }}>Prova</Button.Root> */}
      <label class={styles.toggleContainer}>
        <input id="themeCheckbox" type="checkbox" onClick={() => { toggleTheme() }} value={theme() === "light" ? "dark" : "light"} />
        <FaSolidSun class={styles.sun} />
        <FaSolidMoon class={styles.moon} />
        <span class={styles.toggle} />
      </label>
    </>
  )
}

export default ThemeToggle;
