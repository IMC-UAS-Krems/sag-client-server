import { createSignal, createEffect } from "solid-js";
import type { Component } from "solid-js";

import { useNavigate } from "@solidjs/router";
import { Button } from "@kobalte/core";
import Swal from "sweetalert2";

import { eden } from "@client/api";
import authStore from "@store/authStore";
import Header from "@client/components/Header";
import FormField from "@client/components/FormField";
import styles from "@styles/Signin.module.css";

interface NavigateProps {
  navigate: ReturnType<typeof useNavigate>;
}

const Register: Component<NavigateProps> = ({ navigate }) => {
  const [name, setName] = createSignal<string | undefined>(undefined);
  const [email, setEmail] = createSignal<string | undefined>(undefined);
  const [username, setUsername] = createSignal<string | undefined>(undefined);
  const [password, setPassword] = createSignal<string | undefined>(undefined);
  const [municipality, setMunicipality] = createSignal<string | undefined>(undefined);
  const [organization, setOrganization] = createSignal<string | undefined>(undefined);
  const [municipalities, setMunicipalities] = createSignal<string[]>([]);
  const [organizations, setOrganizations] = createSignal<string[]>([]);

  const [isMunicipalitiesLoading, setIsMunicipalitiesLoading] = createSignal(true);
  const [isOrganizationsLoading, setIsOrganizationsLoading] = createSignal(false);

  const fetchMunicipalities = async () => {
    try {
      const response = await eden.api.municipalities.get();
      if (Array.isArray(response.data)) {
        setMunicipalities(response.data);
      } else {
        console.error("Unexpected response format:", response.data);
      }
    } catch (error) {
      console.error("Error fetching municipalities:", error);
    } finally {
      setIsMunicipalitiesLoading(false);
    }
  };

  const fetchOrganizationsByMunicipality = async (municipalityName: string) => {
    setIsOrganizationsLoading(true);
    try {
      const response = await eden.api.organizationsByMunicipality.post({ municipalityName });
      if (Array.isArray(response.data)) {
        setOrganizations(response.data);
        if (organization()) {
          setOrganization(undefined);
        }
      } else {
        console.error("Unexpected response format:", response.data);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setIsOrganizationsLoading(false);
    }
  };

  createEffect(() => {
    fetchMunicipalities();
  });

  createEffect(() => {
    if (municipality()) {
      fetchOrganizationsByMunicipality(municipality()!);
    }
  });

  const [registerErrors, setRegisterErrors] = createSignal<{ [key: string]: string }>({});
  const validateRegisterForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name()) newErrors.name = "Name is required";
    else if (name()!.length < 4) newErrors.name = "Name must be at least 4 characters long";
    if (!email()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email()!)) newErrors.email = "Email is invalid";
    if (!username()) newErrors.username = "Username is required";
    else if (username()!.length < 4) newErrors.username = "Username must be at least 4 characters long";
    if (!password()) newErrors.password = "Password is required";
    else if (password()!.length < 8) newErrors.password = "Password must be at least 8 characters long";
    if (!municipality()) newErrors.municipality = "Municipality is required";
    if (!organization()) newErrors.organization = "Organization is required";

    setRegisterErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async () => {
    if (!validateRegisterForm()) {
      Swal.fire({
        title: "Error",
        text: "Please fix the errors in the form.",
        icon: "error",
      });
      return;
    }

    const formName = name() ?? "";
    const formEmail = email() ?? "";
    const formUsername = username() ?? "";
    const formPassword = password() ?? "";
    const formMunicipality = municipality() ?? "";
    const formOrganization = organization() ?? "";

    try {
      const response = await eden.auth.register.post({
        name: formName,
        email: formEmail,
        username: formUsername,
        key: formPassword,
        municipalityName: formMunicipality,
        organizationName: formOrganization,
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "POST",
        },
      });

      if (response.error) {
        if (response.error.message) {
          throw new Error(response.error.message);
        } else {
          throw new Error("An unknown error occurred during registration.");
        }
      }

      authStore.setState({ isAuthenticated: true, user: formEmail, userRole: "Developer" });
      navigate("/editor", { replace: true });

      Swal.fire({
        title: "Success",
        text: `Registration successful.`,
        icon: "success",
      });
    } catch (error) {
      let errorMessage = "An unknown error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      Swal.fire({
        title: "Error",
        text: errorMessage,
        icon: "error",
      });
      return;
    }
  };

  return (
    <>
      <div style={{ padding: "50px 0 50px 0", "margin-bottom": "30px" }} class={styles["signin-card-container"]}>
        <form class={styles["signin-form-container"]}>
          <FormField getter={name} setter={setName} labelText="Name" />
          {registerErrors().name && <p class={styles["error-text"]}>{registerErrors().name}</p>}
          <FormField getter={email} setter={setEmail} labelText="Email" />
          {registerErrors().email && <p class={styles["error-text"]}>{registerErrors().email}</p>}
          <FormField getter={username} setter={setUsername} labelText="Username" />
          {registerErrors().username && <p class={styles["error-text"]}>{registerErrors().username}</p>}
          <FormField getter={password} setter={setPassword} labelText="Password" password={true} />
          {registerErrors().password && <p class={styles["error-text"]}>{registerErrors().password}</p>}
          {isMunicipalitiesLoading() ? (
            <div class={styles.loader}></div>
          ) : (
            <>
              <FormField
                getter={municipality}
                setter={setMunicipality}
                labelText="Municipality"
                options={municipalities()}
              />
              {registerErrors().municipality && <p class={styles["error-text"]}>{registerErrors().municipality}</p>}
            </>
          )}
          {isOrganizationsLoading() ? (
            <div class={styles.loader}></div>
          ) : (
            <>
              <FormField
                getter={organization}
                setter={setOrganization}
                labelText="Organization"
                options={organizations()}
              />
              {registerErrors().organization && <p class={styles["error-text"]}>{registerErrors().organization}</p>}
            </>
          )}
        </form>
        <Button.Root onClick={submit}>Submit</Button.Root>
      </div>
    </>
  );
};

const Login: Component<NavigateProps> = ({ navigate }) => {
  const [username, setUsername] = createSignal<string | undefined>(undefined);
  const [password, setPassword] = createSignal<string | undefined>(undefined);
  const [loginErrors, setLoginErrors] = createSignal<{ [key: string]: string }>({});

  const validateLoginForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!username()) newErrors.username = "Username is required";
    else if (username()!.length < 4) newErrors.username = "Username must be at least 4 characters long";
    if (!password()) newErrors.password = "Password is required";
    else if (password()!.length < 8) newErrors.password = "Password must be at least 8 characters long";

    setLoginErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async () => {
    if (!validateLoginForm()) {
      Swal.fire({
        title: "Error",
        text: "Please fix the errors in the form.",
        icon: "error",
      });
      return;
    }

    const formUsername = username();
    const formPassword = password();

    if (!(formUsername && formPassword)) {
      console.log("Invalid data");
      Swal.fire({
        title: "Error",
        text: "Wrong login data",
        icon: "error",
      });
      return;
    }

    const logged = await eden.auth.login.post({
      identifier: formUsername,
      key: formPassword,
      $fetch: {
        mode: "cors",
        credentials: "include",
        method: "POST",
      },
    });

    if (!logged.data || logged.error) {
      console.log(logged.error);
      Swal.fire({
        title: "Error",
        text: "Wrong login data",
        icon: "error",
      });
      return;
    }

    // console.log(`Login successful. Welcome ${logged.data.name}.`);
    authStore.setState({ isAuthenticated: true, user: formUsername, userRole: logged.data.userRole });

    navigate("/home", { replace: true });

    Swal.fire({
      title: "Success",
      text: `Login successful.`,
      icon: "success",
    });
  };

  return (
    <>
      <div class={styles["signin-card-container"]}>
        <form class={styles["signin-form-container"]}>
          <FormField getter={username} setter={setUsername} labelText="Username" />
          {loginErrors().username && <p class={styles["error-text"]}>{loginErrors().username}</p>}
          <FormField getter={password} setter={setPassword} labelText="Password" password={true} />
          {loginErrors().password && <p class={styles["error-text"]}>{loginErrors().password}</p>}
        </form>
        <Button.Root onClick={submit}>Submit</Button.Root>
      </div>
    </>
  );
};

const SignIn: Component = () => {
  const navigate = useNavigate();
  const [mode, setMode] = createSignal<"login" | "register">("login");

  return (
    <Header>
      <main class={styles["signin-main-container"]}>
        {authStore.state().isAuthenticated ? (
          <div class={styles["signin-card-container"]}>
            <h1>You are already logged in as {authStore.state().user}</h1>
          </div>
        ) : (
          <>
            {mode() === "login" ? <Login navigate={navigate} /> : <Register navigate={navigate} />}
            <nav class={styles["submenu-container"]}>
              <Button.Root
                onClick={() => setMode("login")}
                class={mode() === "login" ? styles["active-button"] : styles["nav-button"]}
              >
                Login
              </Button.Root>
              <Button.Root
                onClick={() => setMode("register")}
                class={mode() === "register" ? styles["active-button"] : styles["nav-button"]}
              >
                Register
              </Button.Root>
            </nav>
          </>
        )}
      </main>
    </Header>
  );
};

export default SignIn;
