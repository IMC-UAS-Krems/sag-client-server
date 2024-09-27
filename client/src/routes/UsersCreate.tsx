import { createSignal, createEffect } from "solid-js";
import type { Component } from "solid-js";

import { useNavigate } from "@solidjs/router";
import { Button } from "@kobalte/core";
import Swal from "sweetalert2";

import { eden } from "@client/api";
import { handleUnauthorized } from "@client/utils/authUtils";
import { UserRole } from "@utils/roles";
import Header from "@client/components/Header";
import FormField from "@client/components/FormField";
import styles from "@styles/Signin.module.css";

const UsersCreate: Component = () => {
  const navigate = useNavigate();

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

  const [isMunicipalitiesLoading, setIsMunicipalitiesLoading] = createSignal(true);
  const [isOrganizationsLoading, setIsOrganizationsLoading] = createSignal(false);

  const fetchMunicipalities = async () => {
    try {
      const response = await eden.api.municipalities.get();
      if (response.data) {
        setMunicipalities(response.data);
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
      if (response.data) {
        if (Array.isArray(response.data)) {
          setOrganizations(response.data);
          if (organization()) {
            setOrganization(undefined);
          }
        }
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

    const requestBody = {
      name: name() ?? "",
      email: email() ?? "",
      username: username() ?? "",
      password: password() ?? "",
      municipalityName: municipality() ?? "",
      organizationName: organization() ?? "",
      userRole: userRole() ?? UserRole.Developer,
    };

    // console.log("Data to be submitted:", requestBody);

    try {
      const response = await eden.admin["create-user"].post({
        ...requestBody,
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "POST",
        },
      });

      // Unauthorized check
      if (response.status === 401 || response.status === 403) {
        handleUnauthorized(navigate);
        return;
      }

      if (response.error || response.status !== 201) {
        const errorMessage =
          response.data && "error" in response.data ? response.data.error : "An unknown error occurred";
        throw new Error(errorMessage);
      }

      await Swal.fire({
        title: "Success",
        text: `User created successfully.`,
        icon: "success",
      });

      navigate("/users", { replace: true });
    } catch (error) {
      console.error("Error creating user:", error);

      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      Swal.fire({
        title: "Error",
        text: `${errorMessage}`,
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
                {errors().municipality && <p class={styles["error-text"]}>{errors().municipality}</p>}
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
                {errors().organization && <p class={styles["error-text"]}>{errors().organization}</p>}
              </>
            )}
            <FormField getter={userRole} setter={setUserRole} labelText="User Role" options={Object.values(UserRole)} />
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
