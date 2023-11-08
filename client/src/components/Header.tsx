import { type Component } from "solid-js";
import { A } from "@solidjs/router";
import { Image } from "@kobalte/core";

import styles from "@styles/Header.module.css";
import ThemeToggle from "./ThemeToggle";

import logo from "@assets/logos/sagittarius-logo-bnc.webp";

const Header: Component = () => {
  return (
    <header class={styles.headerMainContianer}>
      <Image.Root fallbackDelay={600} class={styles.img}>
        <Image.Img
          class={styles.imgImg}
          src={logo}
          alt="Sagittarius Logo"
        />
        <Image.Fallback class={styles.imgFallback}>Sagittarius Logo</Image.Fallback>
      </Image.Root>

      <nav>
        <ul>
          <li>
            <A href="/">
              Home
            </A>
          </li>
          <li>
            <A href="/editor">
              Editor
            </A>
          </li>
          <li>
            <A href="/about">
              About Us
            </A>
          </li>
          <li>
            <A href="/sign-in">
              Sign In
            </A>
          </li>
          <li>
            <ThemeToggle />
          </li>
        </ul>
      </nav>
    </header >
  );
}

export default Header;