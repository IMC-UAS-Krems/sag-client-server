import { onMount, type Component, createSignal } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Image } from "@kobalte/core";
import { theme } from "@store/index";
import styles from "@styles/Header.module.css";
import ThemeToggle from "./ThemeToggle";
import logoLight from "@assets/logos/sagittarius-logo-bnc.webp";
import logoDark from "@assets/logos/sagittarius-logo-blk.webp";
import { eden } from "@client/api";

const Header: Component = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [user, setUser] = createSignal("");

  const handleLogout = async () => {
    await eden.auth.logout.post({
      $fetch: {
        mode: "cors",
        credentials: "include",
        method: "POST",
      },
    });
    setIsAuthenticated(false);
    setUser("");
    navigate("/sign-in");
  };

  const checkIfUserIsAuthenticated = async () => {
    try {
      const response = await eden.check_if_cookie_from_request_contains_access_token.get({
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "GET",
        },
      });
      console.log(response);
      if (response.data) {
        setIsAuthenticated(true);
        setUser(response.data);
      } else {
        setIsAuthenticated(false);
        setUser("");
      }
    } catch (error) {
      console.error("Error checking authentication status", error);
    }
  };

  onMount(() => {
    checkIfUserIsAuthenticated();
  });

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
          <li>
            <A href="/home">Home</A>
          </li>
          <li>
            <A href="/editor">Editor</A>
          </li>
          <li>
            <A href="/about">About Us</A>
          </li>
          {isAuthenticated() ? (
            <li>
              <a href="#" onClick={handleLogout}>
                Logout{" "}
                {user() ? (
                  <span>({user()})</span>
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
