import { type Component, onMount, createSignal, onCleanup } from "solid-js";
import { FaSolidSun, FaSolidMoon, FaSolidDesktop } from "solid-icons/fa";
import { theme, setTheme } from "@store/index.ts";
import { Button } from "@client/components/ui/button.tsx";

const ThemeToggle: Component = () => {
  // Using a local signal to track the UI state
  const [currentTheme, setCurrentTheme] = createSignal(theme());

  // Function to check if system is in dark mode
  const isSystemDarkMode = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Function to apply theme to document
  const applyTheme = (mode: string) => {
    if (mode === "dark" || (mode === "system" && isSystemDarkMode())) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Handle system theme changes
  const handleSystemThemeChange = (e: MediaQueryListEvent) => {
    if (currentTheme() === "system") {
      applyTheme("system");
    }
  };

  onMount(() => {
    // Apply the theme initially using the value from the store
    applyTheme(currentTheme());

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    // Cleanup the event listener when component unmounts
    onCleanup(() => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    });
  });

  const toggleTheme = () => {
    let newTheme: string;

    // Cycle through themes: light → dark → system → light
    switch (currentTheme()) {
      case "light":
        newTheme = "dark";
        break;
      case "dark":
        newTheme = "system";
        break;
      default:
        newTheme = "light";
    }

    // Update both the local state and the store
    setCurrentTheme(newTheme);
    setTheme(newTheme);

    // Apply the new theme
    applyTheme(newTheme);
  };

  return (
    <Button onClick={toggleTheme} aria-label="Toggle theme" variant="ghost" class="transition-colors cursor-pointer">
      {currentTheme() === "light" && <FaSolidSun class="h-5 w-5" />}
      {currentTheme() === "dark" && <FaSolidMoon class="h-5 w-5" />}
      {currentTheme() === "system" && <FaSolidDesktop class="h-5 w-5" />}
    </Button>
  );
};

export default ThemeToggle;
