import { type Component, createSignal, createEffect } from "solid-js";
import { TextField, Button } from "@kobalte/core";
import { eden } from "@client/api";
import type { Accessor, Setter } from "solid-js";

import styles from "@styles/Signin.module.css";

import Swal from "sweetalert2";

import authStore from "@store/authStore";

import { useNavigate } from "@solidjs/router";
import { setUser } from "@client/store";
import Header from "@client/components/Header";

const FormField: Component<{
  getter: Accessor<string | undefined>;
  setter: Setter<string | undefined>;
  labelText: string;
  password?: boolean;
}> = ({ getter, setter, labelText, password }) => {
  return (
    <TextField.Root class={styles.textField} value={getter()} onChange={setter}>
      <TextField.Label class={styles.textFieldLabel}>{labelText}</TextField.Label>
      <TextField.Input class={styles.textFieldInput} type={password ? "password" : "text"} />
    </TextField.Root>
  );
};

// TODO: Update such that it utilizes the same improvements as createUser, updateUser
const Register: Component = () => {
  // const [t, { add, locale, dict }] = useI18n();

  const [name, setName] = createSignal<string | undefined>(undefined);
  const [email, setEmail] = createSignal<string | undefined>(undefined);
  const [username, setUsername] = createSignal<string | undefined>(undefined);
  const [password, setPassword] = createSignal<string | undefined>(undefined);
  const [municipality, setMunicipality] = createSignal<string | undefined>(undefined);
  const [organization, setOrganization] = createSignal<string | undefined>(undefined);
  const [municipalities, setMunicipalities] = createSignal<string[]>([]);
  const [organizations, setOrganizations] = createSignal<string[]>([]);

  const navigate = useNavigate();

  const fetchMunicipalities = async () => {
    try {
      const response = await eden.api.municipalities.get();
      if (response.data) {
        setMunicipalities(response.data);
      }
    } catch (error) {
      console.error("Error fetching municipalities:", error);
    }
  };

  const fetchOrganizationsByMunicipality = async (municipalityName: string) => {
    try {
      const response = await eden.api.organizationsByMunicipality.post({ municipalityName });
      if (response.data) {
        setOrganizations(response.data);
        if (organization()) {
          setOrganization(undefined);
        }
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
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

    const formName = name();
    const formEmail = email();
    const formUsername = username();
    const formPassword = password();
    const formMunicipality = municipality();
    const formOrganization = organization();

    const registered = await eden.auth.register.post({
      name: formName,
      email: formEmail,
      username: formUsername,
      key: formPassword,
      municipality: formMunicipality,
      organization: formOrganization,
      $fetch: {
        mode: "cors",
        credentials: "include",
        method: "POST",
      },
    });

    if (!registered.data || registered.error) {
      console.log(registered.error);
      return;
    }

    authStore.setState({ isAuthenticated: true, user: formEmail });

    navigate("/editor", { replace: true });

    Swal.fire({
      title: "Success",
      text: `Login successful.`,
      icon: "success",
    });

    console.log(`Registration successful. Welcome ${registered.data.name}.`);
  };

  return (
    <>
      <div style={{ padding: "50px 0 50px 0", "margin-bottom": "30px" }} class={styles.signinCardContainer}>
        <form class={styles.signinFormContainer}>
          <FormField getter={name} setter={setName} labelText="Name" />
          {registerErrors().name && <p class={styles.errorText}>{registerErrors().name}</p>}
          <FormField getter={email} setter={setEmail} labelText="Email" />
          {registerErrors().email && <p class={styles.errorText}>{registerErrors().email}</p>}
          <FormField getter={username} setter={setUsername} labelText="Username" />
          {registerErrors().username && <p class={styles.errorText}>{registerErrors().username}</p>}
          <FormField getter={password} setter={setPassword} labelText="Password" password={true} />
          {registerErrors().password && <p class={styles.errorText}>{registerErrors().password}</p>}
          <div class={styles.textField}>
            <label class={styles.textFieldLabel}>Municipality</label>
            <select class={styles.textFieldInput} onChange={(e) => setMunicipality(e.currentTarget.value)}>
              <option value="none" selected disabled hidden>
                Select an Option
              </option>
              {municipalities().map((municipality) => (
                <option value={municipality}>{municipality}</option>
              ))}
            </select>
          </div>
          {registerErrors().municipality && <p class={styles.errorText}>{registerErrors().municipality}</p>}
          <div class={styles.textField}>
            <label class={styles.textFieldLabel}>Organization</label>
            <select
              class={styles.textFieldInput}
              value={organization() ?? ""}
              onChange={(e) => setOrganization(e.currentTarget.value)}
            >
              <option value="" disabled hidden>
                Select an Option
              </option>
              {organizations().length > 0 ? (
                organizations().map((organization) => <option value={organization}>{organization}</option>)
              ) : (
                <option disabled>No organizations available</option>
              )}
            </select>
          </div>
          {registerErrors().organization && <p class={styles.errorText}>{registerErrors().organization}</p>}
          {/* <FormField getter={organization} setter={setOrganization} labelText="Organization" /> */}
        </form>
        <Button.Root onClick={submit}>Submit</Button.Root>
      </div>
    </>
  );
};

const Login: Component = () => {
  // const [t, { add, locale, dict }] = useI18n();
  const navigate = useNavigate();

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

    console.log(`Login successful. Welcome ${logged.data.name}.`);

    authStore.setState({ isAuthenticated: true, user: formUsername });

    navigate("/editor", { replace: true });

    Swal.fire({
      title: "Success",
      text: `Login successful.`,
      icon: "success",
    });
  };

  return (
    <>
      <div class={styles.signinCardContainer}>
        <form class={styles.signinFormContainer}>
          <FormField getter={username} setter={setUsername} labelText="Username" />
          {loginErrors().username && <p class={styles.errorText}>{loginErrors().username}</p>}
          <FormField getter={password} setter={setPassword} labelText="Password" password={true} />
          {loginErrors().password && <p class={styles.errorText}>{loginErrors().password}</p>}
        </form>
        <Button.Root onClick={submit}>Submit</Button.Root>
      </div>
    </>
  );
};

const SignIn: Component = () => {
  const [mode, setMode] = createSignal<"login" | "register">("login");
  // const [t, { add, locale, dict }] = useI18n();

  return (
    <Header>
      <main class={styles.signinMainContainer}>
        {mode() === "login" ? <Login /> : <Register />}
        <nav class={styles.submenuContainer}>
          <Button.Root
            onClick={() => setMode("login")}
            class={mode() === "login" ? styles.activeButton : styles.navButton}
          >
            Login
          </Button.Root>
          <Button.Root
            onClick={() => setMode("register")}
            class={mode() === "register" ? styles.activeButton : styles.navButton}
          >
            Register
          </Button.Root>
        </nav>
      </main>
    </Header>
  );
};

export default SignIn;
