import { type Component, JSX, Show } from "solid-js";

import { A, useNavigate } from "@solidjs/router";
import { Image } from "@kobalte/core";

import { eden } from "@client/api";
import { theme } from "@store/index";
import authStore from "@store/authStore";
import styles from "@styles/Header.module.css";

import logoLight from "@assets/logos/sagittarius-logo-bnc.webp";
import logoDark from "@assets/logos/sagittarius-logo-blk.webp";
import ThemeToggle from "./ThemeToggle";

const Header: Component<{ children: JSX.Element }> = (props) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await eden.auth.logout.post({
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "POST",
        },
      });
    } catch (error) {
      console.error("Failed to log out:", error);
    } finally {
      authStore.resetAuth();
      navigate("/home", { replace: true });
    }
  };

  return (
    <>
      <header class={styles["header-main-container"]}>
        <Image.Root fallbackDelay={600} class={styles.img}>
          <Image.Img
            class={styles["img-img"]}
            src={theme() === "light" ? logoDark : logoLight}
            alt="Sagittarius Logo"
          />
          <Image.Fallback class={styles["img-fallback"]}>Sagittarius Logo</Image.Fallback>
        </Image.Root>

        <nav>
          <ul>
            <li>
              <A href="/home">Home</A>
            </li>
            <Show when={authStore.state().userRole === "Developer" || authStore.state().userRole === "Manager"}>
              <li>
                <A href="/editor">Editor</A>
              </li>
            </Show>
            <li>
              <A href="/about">About Us</A>
            </li>
            <Show when={authStore.state().userRole === "Administrator"}>
              <li>
                <A href="/users">Users</A>
              </li>
            </Show>
            <Show when={authStore.state().isAuthenticated}>
              <li>
                <a href="#" onClick={handleLogout}>
                  Logout ({authStore.state().name})
                </a>
              </li>
            </Show>
            <Show when={!authStore.state().isAuthenticated}>
              <li>
                <A href="/sign-in">Sign In</A>
              </li>
            </Show>
            <li>
              <ThemeToggle />
            </li>
          </ul>
        </nav>
      </header>
      {props.children}
    </>
  );
};

export default Header;
