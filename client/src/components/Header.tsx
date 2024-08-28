import { onMount, type Component, JSX } from "solid-js";

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
    await eden.auth.logout.post({
      $fetch: {
        mode: "cors",
        credentials: "include",
        method: "POST",
      },
    });
    authStore.setState({ isAuthenticated: false, user: "", userRole: "" });
    navigate("/sign-in");
  };

  const checkIfUserIsAuthenticated = async () => {
    try {
      const response = await eden.auth["check-if-logged-in"].get({
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "GET",
        },
      });
      console.log("response");
      console.log(response);
      console.log(typeof response.data);
      if (response.status === 200 && response.data) {
        authStore.setState({ isAuthenticated: true, user: response.data.email, userRole: response.data.userRole });
        console.log("here");
        console.log(authStore.state());
      } else {
        authStore.setState({ isAuthenticated: false, user: "", userRole: "" });
      }
    } catch (error) {
      console.error("Error checking authentication status", error);
    }
  };

  onMount(() => {
    checkIfUserIsAuthenticated();
  });

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
            {authStore.state().userRole !== "ADMIN" && (
              <li>
                <A href="/editor">Editor</A>
              </li>
            )}
            <li>
              <A href="/about">About Us</A>
            </li>
            {authStore.state().userRole === "ADMIN" && (
              <li>
                <A href="/users">Users</A>
              </li>
            )}
            {authStore.state().user ? (
              <li>
                <a href="#" onClick={handleLogout}>
                  Logout ({authStore.state().user})
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
      {props.children}
    </>
  );
};

export default Header;
