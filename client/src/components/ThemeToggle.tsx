import { type Component, createSignal } from "solid-js";
import { Button, Image } from "@kobalte/core";

const ThemeToggle: Component = () => {
  const [theme, setTheme] = createSignal("light");

  const toggleTheme = () => {
    document.body.classList.toggle("darkMode");
  }

  return (
    <div>
      <Button.Root onClick={() => { toggleTheme() }}>Prova</Button.Root>
    </div>
  )
}

export default ThemeToggle;
