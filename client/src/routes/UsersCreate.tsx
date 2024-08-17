import { type Component, createSignal, createEffect } from "solid-js";
import type { Accessor, Setter } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { TextField, Button } from "@kobalte/core";
import { eden } from "@client/api";

import Swal from "sweetalert2";
// import authStore from "@store/authStore";
import Header from "@client/components/Header";
// import { UserRole } from "../../../server/prisma";

import styles from "@styles/Signin.module.css";
import { JSCallback } from "bun:ffi";

const FormField: Component<{
  getter: Accessor<string | undefined>;
  setter: Setter<string | undefined>;
  labelText: string;
  password?: boolean;
  error?: string;
}> = ({ getter, setter, labelText, password }) => {
  return (
    <TextField.Root class={styles.textField} value={getter()} onChange={setter}>
      <TextField.Label class={styles.textFieldLabel}>{labelText}</TextField.Label>
      <TextField.Input class={styles.textFieldInput} type={password ? "password" : "text"} />
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
    if (!email()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email()!)) newErrors.email = "Email is invalid";
    if (!username()) newErrors.username = "Username is required";
    if (!password()) newErrors.password = "Password is required";
    if (!municipality()) newErrors.municipality = "Municipality is required";
    if (!organization()) newErrors.organization = "Organisation is required";
    if (!userRole()) newErrors.userRole = "User role is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // const submit = async () => {

  //   if (!validateForm()) {
  //     Swal.fire({
  //       title: "Error",
  //       text: "Please fix the errors in the form.",
  //       icon: "error",
  //     });
  //     return;
  //   }

  //   const formName = name() ?? "";
  //   const formEmail = email() ?? "";
  //   const formUsername = username() ?? "";
  //   const formPassword = password() ?? "";
  //   const formMunicipality = municipality() ?? "";
  //   const formOrganization = organization() ?? "";
  //   const formUserRole = userRole() ?? UserRole.USER;   
    
  //   const requestBody: any = {};
  //   requestBody.name = formName;
  //   requestBody.email = formEmail;
  //   requestBody.username = formUsername;
  //   requestBody.password = formPassword;
  //   requestBody.municipalityName = formMunicipality;
  //   requestBody.organizationName = formOrganization;
  //   requestBody.userRole = formUserRole;

  //   console.log("Data to be submitted:", requestBody);
    

  //   const registered = await eden.admin.createUser.post({
  //     ...requestBody,
  //     $fetch: {
  //       mode: "cors",
  //       credentials: "include",
  //       method: "POST",
  //     },
  //   });

  //   if (!registered.data || registered.error) {
  //     console.log(registered.error);
  //     Swal.fire({
  //       title: "Error",
  //       text: `Error creating user: ${registered.error}`,
  //       icon: "error",
  //     });
  //     return;
  //   }

  //   navigate("/users", { replace: true });

  //   Swal.fire({
  //     title: "Success",
  //     text: `User created successfully.`,
  //     icon: "success",
  //   });

  //   console.log(`Registration successful.`);
  // };

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
      const response = await eden.admin.createUser.post(requestBody, {
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
      <main class={styles.signinMainContainer}>
        <div class={styles.signinCardContainer}>
          <h1>Create User</h1>
          <form class={styles.signinFormContainer}>
            <FormField getter={name} setter={setName} labelText="Name" />
            {errors().name && <p class={styles.errorText}>{errors().name}</p>}
            <FormField getter={email} setter={setEmail} labelText="Email" />
            {errors().email && <p class={styles.errorText}>{errors().email}</p>}
            <FormField getter={username} setter={setUsername} labelText="Username" />
            {errors().username && <p class={styles.errorText}>{errors().username}</p>}
            <FormField getter={password} setter={setPassword} labelText="Password" password={true} />
            {errors().password && <p class={styles.errorText}>{errors().password}</p>}
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
            {errors().municipality && <p class={styles.errorText}>{errors().municipality}</p>}
            <div class={styles.textField}>
              <label class={styles.textFieldLabel}>Organisation</label>
              <select class={styles.textFieldInput} value={organization() ?? ""} onChange={(e) => setOrganization(e.currentTarget.value)}>
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
            {errors().organization && <p class={styles.errorText}>{errors().organization}</p>}
            <div class={styles.textField}>
              <label class={styles.textFieldLabel}>User Role</label>
              <select class={styles.textFieldInput} onChange={(e) => setUserRole(e.currentTarget.value as UserRole)}>
                <option value="" selected disabled hidden>
                  Select an Option
                </option>
                <option value={UserRole.USER}>User</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>
            </div>
            {errors().userRole && <p class={styles.errorText}>{errors().userRole}</p>}
          </form>
          <div class={styles.signinButtons}>
            <Button.Root onClick={submit}>Submit</Button.Root>
            <Button.Root onClick={() => navigate("/users", { replace: true })}>Cancel</Button.Root>
          </div>
        </div>
      </main>
    </Header>
  );
};

export default UsersCreate;
