import { createSignal, createEffect } from "solid-js";
import type { Component } from "solid-js";

import { useNavigate, useParams } from "@solidjs/router";
import { Button } from "@kobalte/core";
import Swal from "sweetalert2";

import { eden } from "@client/api/index.ts";
import { handleUnauthorized } from "@client/utils/authUtils.ts";
import Header from "@client/components/Header.tsx";
import FormField from "@client/components/FormField.tsx";
import styles from "@styles/Signin.module.css";
import { UpdateUserBody } from "@server/types.ts";
import { UserRole } from "@utils/roles.ts";
import { Notification } from "@client/common.ts";

const UsersEdit: Component = () => {
  const navigate = useNavigate();
  const userId = useParams().userId;

  const [name, setName] = createSignal<string | undefined>(undefined);
  const [email, setEmail] = createSignal<string | undefined>(undefined);
  const [username, setUsername] = createSignal<string | undefined>(undefined);
  const [password, setPassword] = createSignal<string | undefined>(undefined);
  const [municipality, setMunicipality] = createSignal<string | undefined>(undefined);
  const [organization, setOrganization] = createSignal<string | undefined>(undefined);
  const [organizations, setOrganizations] = createSignal<string[]>([]);
  const [municipalities, setMunicipalities] = createSignal<string[]>([]);
  const [userRole, setUserRole] = createSignal<UserRole | string | undefined>(undefined);
  const [errors, setErrors] = createSignal<{ [key: string]: string }>({});

  const [oldName, setOldName] = createSignal<string | undefined>(undefined);
  const [oldEmail, setOldEmail] = createSignal<string | undefined>(undefined);
  const [oldUsername, setOldUsername] = createSignal<string | undefined>(undefined);
  const [oldMunicipality, setOldMunicipality] = createSignal<string | undefined>(undefined);
  const [oldOrganization, setOldOrganization] = createSignal<string | undefined>(undefined);
  const [oldUserRole, setOldUserRole] = createSignal<UserRole | string | undefined>(undefined);
  const [userFetchError, setUserFetchErrors] = createSignal<string | null>(null);

  const [loading, setLoading] = createSignal(true);
  const [isMunicipalitiesLoading, setIsMunicipalitiesLoading] = createSignal(true);
  const [isOrganizationsLoading, setIsOrganizationsLoading] = createSignal(false);

  const fetchUserData = async () => {
    try {
      // TODO: It seems like due to some CORS - pre flight issue, the cookie is not being sent 100% correctly from the frontend
      // This results in a No access token found in cookies from `index.ts` `.resolve()`, otherwise works perfectly
      // - Easiest workaround: simply use a POST request instead of GET with query params
      const oldUserData = await eden.admin["user-details"].get({
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
        $query: {
          userId: userId,
        },
      });

      console.log("Fetched user data:", oldUserData);

      // Unauthorized check
      if (oldUserData.status === 401 || oldUserData.status === 403) {
        handleUnauthorized(navigate);
        return;
      }

      if (!oldUserData.data || oldUserData.error) {
        setLoading(false);
        setUserFetchErrors("User not found");
        return;
      }

      if ("name" in oldUserData.data) {
        setOldName(oldUserData.data.name);
        setOldEmail(oldUserData.data.email);
        setOldUsername(oldUserData.data.username);
        setOldMunicipality(oldUserData.data.municipalityName);
        setOldOrganization(oldUserData.data.organizationName);
        setOldUserRole(oldUserData.data.userRole);
      } else {
        setUserFetchErrors("User data is invalid");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserFetchErrors("Error fetching user data");
    } finally {
      setLoading(false);
    }
  };

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
      // console.log("Fetching organizations for municipality:", municipalityName);
      const response = await eden.api.organizationsByMunicipality.post({ municipalityName });
      if (response.data) {
        if (Array.isArray(response.data)) {
          setOrganizations(response.data);
          // console.log("Fetched organizations:", response.data);
        }
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setIsOrganizationsLoading(false);
    }
  };

  createEffect(() => {
    fetchUserData().then(() => {
      fetchMunicipalities();
    });
  });

  createEffect(() => {
    const currentMunicipality = municipality();
    if (currentMunicipality) {
      setOrganization(undefined); // Reset organization selection
      fetchOrganizationsByMunicipality(currentMunicipality);
    }
  });

  const validateForm = () => {
    if (!name() && !email() && !username() && !password() && !municipality() && !organization() && !userRole()) {
      return "No changes made";
    }

    if ((municipality() && !organization()) || (!municipality() && organization())) {
      return "Please select both municipality and organization.";
    }

    const newErrors: { [key: string]: string } = {};

    if (email() && !/\S+@\S+\.\S+/.test(email()!)) newErrors.email = "Email is invalid";
    if (name() && name()!.length < 4) newErrors.name = "Name must be at least 4 characters long";
    if (username() && username()!.length < 4) newErrors.username = "Username must be at least 4 characters long";
    if (password() && password()!.length < 8) newErrors.password = "Password must be at least 8 characters long";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async () => {
    const formValidate = validateForm();
    if (typeof formValidate === "string") {
      Swal.fire({
        title: "Error",
        text: formValidate,
        icon: "error",
      });
      return;
    } else if (!formValidate) {
      Swal.fire({
        title: "Error",
        text: "Please fix the errors in the form.",
        icon: "error",
      });
      return;
    }

    const requestBody: UpdateUserBody = { userId: userId };

    if (name()) requestBody.name = name();
    if (email()) requestBody.email = email();
    if (username()) requestBody.username = username();
    if (password()) requestBody.password = password();
    if (municipality()) requestBody.municipality = municipality();
    if (organization()) requestBody.organization = organization();
    if (userRole()) requestBody.userRole = userRole() as UserRole;

    try {
      const updated = await eden.admin["update-user"].post({
        ...requestBody,
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "POST",
        },
      });

      // Unauthorized check
      if (updated.status === 401 || updated.status === 403) {
        handleUnauthorized(navigate);
        return;
      }

      if (updated.data === null || "error" in updated.data) {
        console.error("Response data:", updated);
        Swal.fire({
          title: "Error",
          text: updated.data?.error || "Error updating user",
          icon: "error",
        });
        return;
      }

      navigate("/users", { replace: true });
      Notification.fire({
        titleText: "User updated successfully",
        icon: "success",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      Swal.fire({
        title: "Error",
        text: `Error updating user: ${error}`,
        icon: "error",
      });
    }
  };

  return (
    <Header>
      <main class={styles["signin-main-container"]}>
        <div class={styles["signin-card-container"]}>
          <h1>Edit User</h1>
          {loading() ? (
            <div class={styles.loader}></div>
          ) : userFetchError() ? (
            <div>
              <p class={styles["error-text"]}>
                {userFetchError()} for user with id: {userId}
              </p>
              <div class={styles["signin-buttons"]}>
                <Button.Root onClick={() => navigate("/users", { replace: true })}>Go Back</Button.Root>
              </div>
            </div>
          ) : (
            <div style="width: 100%">
              <form class={styles["signin-form-container"]}>
                <FormField getter={name} setter={setName} labelText="Name" oldValue={oldName()} />
                {errors().name && <p class={styles["error-text"]}>{errors().name}</p>}
                <FormField getter={email} setter={setEmail} labelText="Email" oldValue={oldEmail()} />
                {errors().email && <p class={styles["error-text"]}>{errors().email}</p>}
                <FormField getter={username} setter={setUsername} labelText="Username" oldValue={oldUsername()} />
                {errors().username && <p class={styles["error-text"]}>{errors().username}</p>}
                <FormField getter={password} setter={setPassword} labelText="Password" oldValue="" password={true} />
                {isMunicipalitiesLoading() ? (
                  <div class={styles.loader}></div>
                ) : (
                  <>
                    <FormField
                      getter={municipality}
                      setter={setMunicipality}
                      labelText="Municipality"
                      oldValue={oldMunicipality()}
                      options={municipalities()}
                    />
                    {errors().password && <p class={styles["error-text"]}>{errors().password}</p>}
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
                      oldValue={oldOrganization()}
                      options={organizations()}
                    />
                    {errors().organization && <p class={styles["error-text"]}>{errors().organization}</p>}
                  </>
                )}
                <FormField
                  getter={userRole}
                  setter={setUserRole}
                  labelText="User Role"
                  oldValue={oldUserRole()}
                  options={Object.values(UserRole)}
                />
                {errors().userRole && <p class={styles["error-text"]}>{errors().userRole}</p>}
              </form>
              <div class={styles["signin-buttons"]}>
                <Button.Root onClick={submit}>Submit</Button.Root>
                <Button.Root onClick={() => navigate("/users", { replace: true })}>Cancel</Button.Root>
              </div>
            </div>
          )}
        </div>
      </main>
    </Header>
  );
};

export default UsersEdit;
