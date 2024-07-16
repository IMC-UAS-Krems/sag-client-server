import { onMount, type Component } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Image } from "@kobalte/core";
import { theme } from "@store/index";

import styles from "@styles/Header.module.css";
import ThemeToggle from "./ThemeToggle";

import logoLight from "@assets/logos/sagittarius-logo-bnc.webp";
import logoDark from "@assets/logos/sagittarius-logo-blk.webp";

import authStore from "@store/authStore";
import { eden } from "@client/api";

const Header: Component = () => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    authStore.setState({ isAuthenticated: false, user: "" });
    await eden.auth.logout.post({
      $fetch: {
        mode: "cors",
        credentials: "include",
        method: "POST",
      },
    });
    navigate("/sign-in");
  };

  return (
    <header class={styles.headerMainContianer}>
      <Image.Root fallbackDelay={600} class={styles.img}>
        <Image.Img
          class={styles.imgImg}
          src={theme() === "light" ? logoDark : logoLight}
          alt="Sagittarius Logo"
        />
        <Image.Fallback class={styles.imgFallback}>
          Sagittarius Logo
        </Image.Fallback>
      </Image.Root>

      <nav>
        <ul>
          {/* <li>
            {authStore.state().user.length != 0 ? (
              <span>{authStore.state().user}</span>
            ) : null}
          </li> */}
          <li>
            <A href="/home">Home</A>
          </li>
          <li>
            <A href="/editor">Editor</A>
          </li>
          <li>
            <A href="/about">About Us</A>
          </li>
          {authStore.state().isAuthenticated ? (
            <li>
              <a href="#" onClick={handleLogout}>
                Logout{" "}
                {authStore.state().user.length != 0 ? (
                  <span>({authStore.state().user})</span>
                ) : null}
              </a>
            </li>
          ) : (
            <li>
              <A href="/sign-in">Sign In</A>
            </li>
          )}
          <li>
            <ThemeToggle />
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
