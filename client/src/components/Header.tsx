import { type Component, JSX, Show } from "solid-js";

import { A, useNavigate, useLocation } from "@solidjs/router";
import { Image } from "@kobalte/core";

import { eden } from "@client/api/index.ts";
import { theme } from "@store/index.ts";
import authStore from "@store/authStore.ts";
import { NavigationMenu, NavigationMenuTrigger } from "@client/components/ui/navigation-menu.tsx";
import { showToast } from "@client/components/ui/toast.tsx";

import logoLight from "@assets/logos/logo_imc_inverse.png";
import logoDark from "@assets/logos/logo_imc.png";
import ThemeToggle from "./ThemeToggle.tsx";

const Header: Component<{ children: JSX.Element }> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      const response = await eden.auth.logout.post({
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "POST",
        },
      });

      if (response?.data?.success) {
        showToast({
          variant: "success",
          title: "Success",
          description: "Logged out successfully",
        });
      } else {
        console.error("Failed to log out. Server response:", response);
        showToast({
          variant: "error",
          title: "Error",
          description: "Logout failed",
        });
      }
    } catch (error) {
      console.error("Failed to log out:", error);
      showToast({
        variant: "error",
        title: "Error",
        description: "Logout failed",
      });
    } finally {
      authStore.resetAuth();
      navigate("/home", { replace: true });
    }
  };

  return (
    <>
      <header class="flex align-center items-center justify-between overflow-hidden p-2.5">
        {/* TODO: This should instead be an SVG in the future with coloring based on Theme() */}
        <Image.Root
          fallbackDelay={600}
          class="inline-flex items-center justify-center align-middle overflow-hidden select-none h-14"
        >
          <Image.Img
            class="w-full h-full object-cover"
            src={theme() === "light" ? logoDark : logoLight}
            alt="IMC Krems logo"
          />
          <Image.Fallback class="w-full h-full flex items-center justify-center text-slate text-base font-medium leading-none">
            Sagittarius Logo
          </Image.Fallback>
        </Image.Root>
        <NavigationMenu class="gap-2">
          <NavigationMenuTrigger as="a" href="/home" current={location.pathname === "/home"}>
            Home
          </NavigationMenuTrigger>

          <Show when={authStore.state().isAuthenticated && authStore.state().verified === false}>
            <NavigationMenuTrigger as="a" href="/verify" current={location.pathname === "/verify"}>
              Verify
            </NavigationMenuTrigger>
          </Show>
          <Show
            when={
              (authStore.state().userRole === "Developer" || authStore.state().userRole === "Manager") &&
              authStore.state().verified === true
            }
          >
            <NavigationMenuTrigger as={A} href="/editor" current={location.pathname === "/editor"}>
              Editor
            </NavigationMenuTrigger>
          </Show>
          <NavigationMenuTrigger as={A} href="/about" current={location.pathname === "/about"}>
            About Us
          </NavigationMenuTrigger>
          <Show when={authStore.state().userRole === "Administrator"}>
            <NavigationMenuTrigger as={A} href="/organisations">
              Organisations
            </NavigationMenuTrigger>
            <NavigationMenuTrigger as={A} href="/users" current={location.pathname === "/users"}>
              Users
            </NavigationMenuTrigger>
          </Show>
          <Show
            when={authStore.state().isAuthenticated}
            fallback={
              <NavigationMenuTrigger as={A} href="/sign-in" current={location.pathname === "/sign-in"}>
                Sign In
              </NavigationMenuTrigger>
            }
          >
            <NavigationMenuTrigger as={A} href="#" onClick={handleLogout}>
              Logout ({authStore.state().name})
            </NavigationMenuTrigger>
          </Show>
          <ThemeToggle />
        </NavigationMenu>
      </header>
      {props.children}
    </>
  );
};

export default Header;
