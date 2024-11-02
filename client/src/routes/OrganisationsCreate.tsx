import { Component } from "solid-js";
import { eden } from "@client/api";
import { useNavigate } from "@solidjs/router";
import { createSignal, createEffect } from "solid-js";
import Swal from "sweetalert2";
import { handleUnauthorized } from "@client/utils/authUtils";
import styles from "@styles/Signin.module.css";
import Header from "@client/components/Header";
import FormField from "@client/components/FormField";
import { Button } from "@kobalte/core";

const OrganisationCreate: Component = () => {
  const navigate = useNavigate();

  const [organisationName, setOrganizationName] = createSignal<string | undefined>(undefined);
  const [organisationDescription, setOrganisationDescription] = createSignal<string | undefined>(undefined);
  const [municipalityName, setMunicipalityName] = createSignal<string | undefined>(undefined);
  const [municipalities, setMunicipalities] = createSignal<string[]>([]);

  const [isMunicipalitiesLoading, setIsMunicipalitiesLoading] = createSignal(true);
  const [errors, setErrors] = createSignal<{ [key: string]: string }>({});

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

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!organisationName()) newErrors.organisationName = "Name is required";
    else if (organisationName()!.length < 2) newErrors.organisationName = "Name must be at least 2 characters long";
    if (!organisationDescription()) newErrors.description = "Description is required";
    if (!municipalityName()) newErrors.municipality = "Municipality is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  createEffect(() => {
    fetchMunicipalities();
  });

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
      organisationName: organisationName()?.trim() ?? "",
      organisationDescription: organisationDescription()?.trim() ?? "",
      municipalityName: municipalityName() ?? "",
      verified: true,
    };

    try {
      const response = await eden.admin["create-organisation"].post({
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
        text: `Organisation created successfully.`,
        icon: "success",
      });

      navigate("/organisations", { replace: true });
    } catch (error) {
      console.error("Error creating organisation:", error);

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
          <h1>Create Organisation</h1>
          <form class={styles["signin-form-container"]}>
            <FormField getter={organisationName} setter={setOrganizationName} labelText="Organisation name" />
            {errors().organisationName && <p class={styles["error-text"]}>{errors().organisationName}</p>}
            {isMunicipalitiesLoading() ? (
              <div class={styles.loader}></div>
            ) : (
              <>
                <FormField
                  getter={municipalityName}
                  setter={setMunicipalityName}
                  labelText="Municipality"
                  options={municipalities()}
                />
                {errors().municipality && <p class={styles["error-text"]}>{errors().municipality}</p>}
                <FormField
                  getter={organisationDescription}
                  setter={setOrganisationDescription}
                  labelText="Organisation Description"
                />
                {errors().description && <p class={styles["error-text"]}>{errors().description}</p>}
              </>
            )}
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

export default OrganisationCreate;
