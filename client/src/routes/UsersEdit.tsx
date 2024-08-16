import { type Component, createSignal, createEffect } from "solid-js";
import type { Accessor, Setter } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { TextField, Button } from "@kobalte/core";
import { eden } from "@client/api";

import Swal from "sweetalert2";
// import authStore from "@store/authStore";
import Header from "@client/components/Header";
// import { UserRole } from "../../../server/prisma";
import styles from "@styles/Signin.module.css";

const FormField: Component<{
  getter: Accessor<string | undefined>;
  setter: Setter<string | undefined>;
  labelText: string;
  oldValue: string | undefined;
  password?: boolean;
  error?: string;
}> = ({ getter, setter, labelText, oldValue, password }) => {
  console.log(`Rendering FormField for ${labelText} with oldValue: ${oldValue}`);
  return (
    <TextField.Root class={styles.textField} value={getter()} onChange={setter}>
      <TextField.Label class={styles.textFieldLabel}>{labelText}</TextField.Label>
      <TextField.Input class={styles.textFieldInput} type={password ? "password" : "text"} placeholder={oldValue} />
    </TextField.Root>
  );
};

const UsersEdit: Component = () => {
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
  const [organisation, setOrganisation] = createSignal<string | undefined>(undefined);
  const [organisations, setOrganisations] = createSignal<string[]>([]);
  const [municipalities, setMunicipalities] = createSignal<string[]>([]);
  const [userRole, setUserRole] = createSignal<UserRole | undefined>(undefined);
  const [errors, setErrors] = createSignal<{ [key: string]: string }>({});

  const navigate = useNavigate();

  const userId = useParams().userId;
  console.log(userId);

  const [oldName, setOldName] = createSignal<string | undefined>(undefined);
  const [oldEmail, setOldEmail] = createSignal<string | undefined>(undefined);
  const [oldUsername, setOldUsername] = createSignal<string | undefined>(undefined);
  // const [oldPassword, setOldPassword] = createSignal<string | undefined>(undefined);
  const [oldMunicipality, setOldMunicipality] = createSignal<string | undefined>(undefined);
  const [oldOrganisation, setOldOrganisation] = createSignal<string | undefined>(undefined);
  const [oldUserRole, setOldUserRole] = createSignal<UserRole | undefined>(undefined);
  //   const [userFetchError, setUserFetchErrors] = createSignal<{ [key: string]: string }>({});
  const [userFetchError, setUserFetchErrors] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);

  const fetchUserData = async () => {
    // TODO: Fetch user data here using the userId
    try {
      // const url = new URL(eden.admin["update-user"].getUrl());
      // url.searchParams.append("userId", userId);

      const oldUserData = await eden.admin["update-user"].get({
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

      console.log("Old user fetch:", oldUserData);

      if (!oldUserData.data || oldUserData.error) {
        setLoading(false);
        setUserFetchErrors("User not found");
        console.warn("Error is:", userFetchError());
        return;
      } else {
        console.log("Old user data:", oldUserData.data);
        setOldName(oldUserData.data.name);
        setOldEmail(oldUserData.data.email);
        setOldUsername(oldUserData.data.username);
        // TODO: Municipality and Organisation are IDs, change API such that names are also returned
        setOldMunicipality(oldUserData.data.municipalityId);
        setOldOrganisation(oldUserData.data.organizationId);
        setOldUserRole(oldUserData.data.userRole);
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      console.error("Error fetching user data:", error);
      setUserFetchErrors("Error fetching user data");
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
    }
  };

  const fetchOrganisationsByMunicipality = async (municipalityName: string) => {
    try {
      const response = await eden.api.organizationsByMunicipality.post({ municipalityName });
      if (response.data) {
        setOrganisations(response.data);
        if (organisation()) {
          setOrganisation(undefined);
        }
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  };

  createEffect(() => {
    fetchUserData();
    fetchMunicipalities();
  });

  createEffect(() => {
    if (municipality()) {
      fetchOrganisationsByMunicipality(municipality()!);
    }
  });

  const validateForm = () => {
    // TODO: Make a check such that at least something is changed
    if (!name() && !email() && !username() && !password() && !municipality() && !organisation() && !userRole()) {
      return "No changes made";
    }

    const newErrors: { [key: string]: string } = {};
    if (email() && !/\S+@\S+\.\S+/.test(email()!)) {
      newErrors.email = "Email is invalid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async () => {
    const formValidate = validateForm();
    if (formValidate === "No changes made") {
      Swal.fire({
        title: "Error",
        text: "No changes made.",
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

    // Creating the request body - only sending the fields that have been changed
    const formName = name();
    const formEmail = email();
    const formUsername = username();
    const formPassword = password();
    const formMunicipality = municipality();
    const formOrganisation = organisation();
    const formUserRole = userRole();

    const requestBody: any = { userId: userId };

    if (formName) requestBody.name = formName;
    if (formEmail) requestBody.email = formEmail;
    if (formUsername) requestBody.username = formUsername;
    if (formPassword) requestBody.password = formPassword;
    if (formMunicipality) requestBody.municipality = formMunicipality;
    if (formOrganisation) requestBody.organisation = formOrganisation;
    if (formUserRole) requestBody.userRole = formUserRole;

    const updated = await eden.admin["update-user"].post({
      ...requestBody,
      $fetch: {
        mode: "cors",
        credentials: "include",
        method: "POST",
      },
    });

    // TODO: Handle error
    if (!updated.data || updated.error) {
      console.log(updated.error);
      Swal.fire({
        title: "Error",
        text: `Error updating user.`,
        icon: "error",
      });
      return;
    }

    navigate("/users", { replace: true });

    Swal.fire({
      title: "Success",
      text: `User updated successfully.`,
      icon: "success",
    });

    console.log(`User update successful.`);
  };

  return (
    <Header>
      <main class={styles.signinMainContainer}>
        <div class={styles.signinCardContainer}>
          <h1>Edit User</h1>
          {loading() ? (
            <div class={styles.loader}></div>
          ) : userFetchError() ? (
            <div>
              <p class={styles.errorText}>
                {userFetchError()} for user with id: {userId}
              </p>
              <div class={styles.signinButtons}>
                <Button.Root onClick={() => navigate("/users", { replace: true })}>Go Back</Button.Root>
              </div>
            </div>
          ) : (
            <div style="width: 100%">
              <form class={styles.signinFormContainer}>
                <FormField getter={name} setter={setName} labelText="Name" oldValue={oldName()} />
                {errors().name && <p class={styles.errorText}>{errors().name}</p>}
                <FormField getter={email} setter={setEmail} labelText="Email" oldValue={oldEmail()} />
                {errors().email && <p class={styles.errorText}>{errors().email}</p>}
                <FormField getter={username} setter={setUsername} labelText="Username" oldValue={oldUsername()} />
                {errors().username && <p class={styles.errorText}>{errors().username}</p>}
                <FormField getter={password} setter={setPassword} labelText="Password" oldValue="" password={true} />
                {errors().password && <p class={styles.errorText}>{errors().password}</p>}
                {/* TODO: Preselect the oldMunicipality */}
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
                {/* TODO: Preselect the Organisation */}

                {/* <FormField
                  getter={organisation}
                  setter={setOrganisation}
                  labelText="Organisation"
                  oldValue={oldOrganisation()}
                /> */}
                <div class={styles.textField}>
                  <label class={styles.textFieldLabel}>Organisation</label>
                  <select class={styles.textFieldInput} value={organisation() ?? ""} onChange={(e) => setOrganisation(e.currentTarget.value)}>
                    <option value="" disabled hidden>
                      Select an Option
                    </option>
                    {organisations().length > 0 ? (
                      organisations().map((organisation) => <option value={organisation}>{organisation}</option>)
                    ) : (
                      <option disabled>No organizations available</option>
                    )}
                  </select>
                </div>
                {errors().organisation && <p class={styles.errorText}>{errors().organisation}</p>}
                {/* TODO: Preselect the userRole */}
                <div class={styles.textField}>
                  <label class={styles.textFieldLabel}>User Role</label>
                  <select
                    class={styles.textFieldInput}
                    onChange={(e) => setUserRole(e.currentTarget.value as UserRole)}
                  >
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
          )}
        </div>
      </main>
    </Header>
  );
};

export default UsersEdit;
