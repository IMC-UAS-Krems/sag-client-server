import { type Component, createSignal } from "solid-js";
// import { useI18n } from "@solid-primitives/i18n";
import { TextField, Button } from "@kobalte/core";
import { eden } from "@client/api";
import type { Accessor, Setter } from "solid-js";

import styles from "@styles/Signin.module.css";

import Swal from "sweetalert2";

const FormField: Component<{
  getter: Accessor<string | undefined>;
  setter: Setter<string | undefined>;
  labelText: string;
  password?: boolean;
}> = ({ getter, setter, labelText, password }) => {
  return (
    <TextField.Root class={styles.textField} value={getter()} onChange={setter}>
      <TextField.Label class={styles.textFieldLabel}>
        {labelText}
      </TextField.Label>
      <TextField.Input
        class={styles.textFieldInput}
        type={password ? "password" : "text"}
      />
    </TextField.Root>
  );
};

const Register: Component = () => {
  // const [t, { add, locale, dict }] = useI18n();

  const [name, setName] = createSignal<string | undefined>(undefined);
  const [email, setEmail] = createSignal<string | undefined>(undefined);
  const [username, setUsername] = createSignal<string | undefined>(undefined);
  const [password, setPassword] = createSignal<string | undefined>(undefined);
  const [municipality, setMunicipality] = createSignal<string | undefined>(
    undefined
  );
  const [organisation, setOrganisation] = createSignal<string | undefined>(
    undefined
  );

  const submit = async () => {
    const formName = name();
    const formEmail = email();
    const formUsername = username();
    const formPassword = password();
    const formMunicipality = municipality();
    const formOrganisation = organisation();

    if (!(formName && formEmail && formUsername && formPassword)) {
      console.log("Invalid data");
      Swal.fire({
        title: "Error",
        text: "Wrong login data",
        icon: "error",
      });
      return;
    }

    const registered = await eden.auth.register.post({
      name: formName,
      email: formEmail,
      username: formUsername,
      key: formPassword,
      municipality: formMunicipality,
      organisation: formOrganisation,
    });

    if (!registered.data || registered.error) {
      console.log(registered.error);
      return;
    }

    console.log(`Registration successful. Welcome ${registered.data.name}.`);
  };

  return (
    <>
      <div
        style={{ padding: "50px 0 50px 0", "margin-bottom": "30px" }}
        class={styles.signinCardContainer}
      >
        <form class={styles.signinFormContainer}>
          <FormField getter={name} setter={setName} labelText="Name" />
          <FormField getter={email} setter={setEmail} labelText="Email" />
          <FormField
            getter={username}
            setter={setUsername}
            labelText="Username"
          />
          <FormField
            getter={password}
            setter={setPassword}
            labelText="Password"
            password={true}
          />
          <div class={styles.textField}>
            <label class={styles.textFieldLabel}>Municipality</label>
            <select
              class={styles.textFieldInput}
              value={municipality()}
              onInput={(e) => setMunicipality(e.currentTarget.value)}
            >
              <option value="A">Krems</option>
              <option value="B">Sankt Pölten</option>
              <option value="C">Tulln</option>
            </select>
          </div>
          <FormField
            getter={organisation}
            setter={setOrganisation}
            labelText="Organisation"
          />
        </form>
        <Button.Root onClick={submit}>Submit</Button.Root>
      </div>
    </>
  );
};

const Login: Component = () => {
  // const [t, { add, locale, dict }] = useI18n();

  const [username, setUsername] = createSignal<string | undefined>(undefined);
  const [password, setPassword] = createSignal<string | undefined>(undefined);

  const submit = async () => {
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
    });

    if (!logged.data || logged.error) {
      console.log(logged.error);
      return;
    }

    console.log(`Login successful. Welcome ${logged.data.name}.`);

    window.location.href = "/editor";
  };

  return (
    <>
      <div class={styles.signinCardContainer}>
        <form class={styles.signinFormContainer}>
          <FormField
            getter={username}
            setter={setUsername}
            labelText="Username"
          />
          <FormField
            getter={password}
            setter={setPassword}
            labelText="Password"
            password={true}
          />
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
  );
};

export default SignIn;
