import { createSignal, createEffect } from "solid-js";
import type { Component, Accessor, Setter } from "solid-js";

import { useNavigate } from "@solidjs/router";
import { TextField, Button } from "@kobalte/core";
import Swal from "sweetalert2";

import { eden } from "@client/api";
import Header from "@client/components/Header";
import styles from "@styles/Signin.module.css";
// import { JSCallback } from "bun:ffi";

const FormField: Component<{
  getter: Accessor<string | undefined>;
  setter: Setter<string | undefined>;
  labelText: string;
  password?: boolean;
  error?: string;
}> = ({ getter, setter, labelText, password }) => {
  return (
    <TextField.Root class={styles["text-field"]} value={getter()} onChange={setter}>
      <TextField.Label class={styles["text-field-label"]}>{labelText}</TextField.Label>
      <TextField.Input class={styles["text-field-input"]} type={password ? "password" : "text"} />
    </TextField.Root>
  );
};

const UsersCreate: Component = () => {
  // const [t, { add, locale, dict }] = useI18n();

  enum UserRole {
    USER = "USER",
    ADMIN = "ADMIN",
  }

  const [name, setName] = createSignal<string | undefined>(undefined);
  const [email, setEmail] = createSignal<string | undefined>(undefined);
  const [username, setUsername] = createSignal<string | undefined>(undefined);
  const [password, setPassword] = createSignal<string | undefined>(undefined);
  const [municipality, setMunicipality] = createSignal<string | undefined>(undefined);
  const [organization, setOrganization] = createSignal<string | undefined>(undefined);
  const [municipalities, setMunicipalities] = createSignal<string[]>([]);
  const [organizations, setOrganizations] = createSignal<string[]>([]);
  const [userRole, setUserRole] = createSignal<UserRole | undefined>(undefined);
  const [errors, setErrors] = createSignal<{ [key: string]: string }>({});

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

  const validateForm = () => {
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
    if (!userRole()) newErrors.userRole = "User role is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async () => {
    if (!validateForm()) {
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
    const formUserRole = userRole() ?? UserRole.USER;

    const requestBody = {
      name: formName,
      email: formEmail,
      username: formUsername,
      password: formPassword,
      municipalityName: formMunicipality,
      organizationName: formOrganization,
      userRole: formUserRole,
    };

    console.log("Data to be submitted:", requestBody);

    try {
      const response = await eden.admin.createUser.post({
        ...requestBody,
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "POST",
        },
      });

      if (!response.data || response.error) {
        console.error(response.error);
        Swal.fire({
          title: "Error",
          text: `Error creating user: ${response.error}`,
          icon: "error",
        });
        return;
      }

      navigate("/users", { replace: true });

      Swal.fire({
        title: "Success",
        text: `User created successfully.`,
        icon: "success",
      });

      console.log(`Registration successful.`);
    } catch (error) {
      console.error("Error submitting form:", error);
      Swal.fire({
        title: "Error",
        text: `An unexpected error occurred: ${error.message}`,
        icon: "error",
      });
    }
  };

  return (
    <Header>
      <main class={styles["signin-main-container"]}>
        <div class={styles["signin-card-container"]}>
          <h1>Create User</h1>
          <form class={styles["signin-form-container"]}>
            <FormField getter={name} setter={setName} labelText="Name" />
            {errors().name && <p class={styles["error-text"]}>{errors().name}</p>}
            <FormField getter={email} setter={setEmail} labelText="Email" />
            {errors().email && <p class={styles["error-text"]}>{errors().email}</p>}
            <FormField getter={username} setter={setUsername} labelText="Username" />
            {errors().username && <p class={styles["error-text"]}>{errors().username}</p>}
            <FormField getter={password} setter={setPassword} labelText="Password" password={true} />
            {errors().password && <p class={styles["error-text"]}>{errors().password}</p>}
            <div class={styles["text-field"]}>
              <label class={styles["text-field-label"]}>Municipality</label>
              <select class={styles["text-field-input"]} onChange={(e) => setMunicipality(e.currentTarget.value)}>
                <option value="none" selected disabled hidden>
                  Select an Option
                </option>
                {municipalities().map((municipality) => (
                  <option value={municipality}>{municipality}</option>
                ))}
              </select>
            </div>
            {errors().municipality && <p class={styles["error-text"]}>{errors().municipality}</p>}
            <div class={styles["text-field"]}>
              <label class={styles["text-field-label"]}>Organization</label>
              <select
                class={styles["text-field-input"]}
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
            {errors().organization && <p class={styles["error-text"]}>{errors().organization}</p>}
            <div class={styles["text-field"]}>
              <label class={styles["text-field-label"]}>User Role</label>
              <select class={styles["text-field-input"]} onChange={(e) => setUserRole(e.currentTarget.value as UserRole)}>
                <option value="" selected disabled hidden>
                  Select an Option
                </option>
                <option value={UserRole.USER}>User</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>
            </div>
            {errors().userRole && <p class={styles["error-text"]}>{errors().userRole}</p>}
          </form>
          <div class={styles["signin-buttons"]}>
            <Button.Root onClick={submit}>Submit</Button.Root>
            <Button.Root onClick={() => navigate("/users", { replace: true })}>Cancel</Button.Root>
          </div>
        </div>
      </main>
    </Header>
  );
};

export default UsersCreate;
