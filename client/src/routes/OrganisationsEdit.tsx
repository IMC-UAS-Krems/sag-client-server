import { createSignal, createEffect } from "solid-js";
import type { Component } from "solid-js";

import { useNavigate, useParams } from "@solidjs/router";
import { handleUnauthorized } from "@client/utils/authUtils";
import { UpdateOrganisationBody } from "@server/types";

import { Button } from "@kobalte/core";
import Swal from "sweetalert2";
import { eden } from "@client/api";
import Header from "@client/components/Header";
import FormField from "@client/components/FormField";
import styles from "@styles/Signin.module.css";

const OrganisationsEdit: Component = () => {
  const navigate = useNavigate();
  const organisationId = useParams().organisationId;

  const [organisationName, setOrganizationName] = createSignal<string | undefined>(undefined);
  const [municipalityName, setMunicipalityName] = createSignal<string | undefined>(undefined);
  const [organisationDescription, setOrganisationDescription] = createSignal<string | undefined>(undefined);
  const [municipalities, setMunicipalities] = createSignal<string[]>([]);
  const [verified, setVerified] = createSignal<boolean | undefined>(undefined);

  const [oldOrganisationName, setOldOrganisationName] = createSignal<string | undefined>(undefined);
  const [oldDescription, setOldDescription] = createSignal<string | undefined>(undefined);
  const [oldMunicipalityName, setOldMunicipalityName] = createSignal<string | undefined>(undefined);
  const [oldVerified, setOldVerified] = createSignal<boolean | undefined>(undefined);

  const [loading, setLoading] = createSignal(true);
  const [isMunicipalitiesLoading, setIsMunicipalitiesLoading] = createSignal(true);
  const [errors, setErrors] = createSignal<{ [key: string]: string }>({});
  const [organisationFetchError, setOrganisationFetchErrors] = createSignal<string | null>(null);

  const fetchOrganisationData = async () => {
    try {
      const oldOrganisationData = await eden.admin["organisation-details"].get({
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
        $query: {
          organisationId: organisationId,
        },
      });

      // console.log(oldOrganisationData);

      if (oldOrganisationData.status === 401 || oldOrganisationData.status === 403) {
        handleUnauthorized(navigate);
        return;
      }

      if (!oldOrganisationData.data || oldOrganisationData.error) {
        setLoading(false);
        setOrganisationFetchErrors("Organisation not found");
        return;
      }

      if ("name" in oldOrganisationData.data) {
        setOldOrganisationName(oldOrganisationData.data.name);
        setOldDescription(oldOrganisationData.data.description);
        setOldMunicipalityName(oldOrganisationData.data.municipality.name);
        setOldDescription(oldOrganisationData.data.description);
        setOldVerified(oldOrganisationData.data.verified);
      } else {
        setOrganisationFetchErrors("Organisation data is invalid");
      }
    } catch (error) {
      console.error("Error fetching organisation data:", error);
      setOrganisationFetchErrors("Error fetching organisation data");
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

  createEffect(() => {
    fetchOrganisationData().then(() => {
      fetchMunicipalities();
    });
  });

  const validateForm = () => {
    if (!organisationName() && !organisationDescription() && !municipalityName() && !verified()) {
      return "No changes made";
    }

    const newErrors: { [key: string]: string } = {};

    if (!organisationName() && !oldOrganisationName()) {
      newErrors.name = "Name is required";
    } else if (organisationName() && organisationName()!.length < 2) {
      newErrors.name = "Name must be at least 2 characters long";
    }

    if (!organisationDescription() && !oldDescription()) {
      newErrors.description = "Description is required";
    }

    if (!municipalityName() && !oldMunicipalityName()) {
      newErrors.municipality = "Municipality is required";
    }

    if (verified() === undefined && oldVerified() === undefined) {
      newErrors.verified = "Verified status is required";
    }

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

    const requestBody: UpdateOrganisationBody = {
      id: organisationId,
      ...(organisationName() !== undefined ? { name: organisationName() } : {}),
      ...(organisationDescription() !== undefined ? { description: organisationDescription() } : {}),
      ...(municipalityName() !== undefined ? { municipalityName: municipalityName() } : {}),
      ...(verified() !== undefined ? { verified: verified() } : {}),
      updatedAt: new Date(),
    };

    console.log("Request body:", requestBody);

    try {
      const updated = await eden.admin["update-organisation"].post({
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
          text: updated.data?.error || "Error updating Organisation",
          icon: "error",
        });
        return;
      }

      Swal.fire({
        title: "Success",
        text: `Organisation updated successfully.`,
        icon: "success",
      });

      navigate("/organisations", { replace: true });
    } catch (error) {
      console.error("Error updating organisation:", error);
      Swal.fire({
        title: "Error",
        text: `Error updating organisation: ${error}`,
        icon: "error",
      });
    }
  };
  return (
    <Header>
      <main class={styles["signin-main-container"]}>
        <div class={styles["signin-card-container"]}>
          <h1>Edit Organisation</h1>
          {loading() ? (
            <div class={styles.loader}></div>
          ) : organisationFetchError() ? (
            <div>
              <p class={styles["error-text"]}>
                {organisationFetchError()} for organisation with id: {organisationId}
              </p>
              <div class={styles["signin-buttons"]}>
                <Button.Root onClick={() => navigate("/organisations", { replace: true })}>Go Back</Button.Root>
              </div>
            </div>
          ) : (
            <div style="width: 100%">
              <form class={styles["signin-form-container"]}>
                <FormField
                  getter={organisationName}
                  setter={setOrganizationName}
                  labelText="Name"
                  oldValue={oldOrganisationName()}
                />
                {errors().organisationName && <p class={styles["error-text"]}>{errors().organisationName}</p>}
                <FormField
                  getter={organisationDescription}
                  setter={setOrganisationDescription}
                  labelText="Description"
                  oldValue={oldDescription()}
                />
                {errors().organisation && <p class={styles["error-text"]}>{errors().organisation}</p>}

                {isMunicipalitiesLoading() ? (
                  <div class={styles.loader}></div>
                ) : (
                  <>
                    <FormField
                      getter={municipalityName}
                      setter={setMunicipalityName}
                      labelText="Municipality"
                      oldValue={oldMunicipalityName()}
                      options={municipalities()}
                    />
                  </>
                )}
                <div class={styles["checkbox-container"]}>
                  <label for="verified">Verified</label>
                  <input
                    type="checkbox"
                    id="verified"
                    checked={verified() !== undefined ? verified() : oldVerified()}
                    onChange={(e) => setVerified(e.currentTarget.checked)}
                  />
                </div>
              </form>
              <div class={styles["signin-buttons"]}>
                <Button.Root onClick={submit}>Submit</Button.Root>
                <Button.Root onClick={() => navigate("/organisations", { replace: true })}>Cancel</Button.Root>
              </div>
            </div>
          )}
        </div>
      </main>
    </Header>
  );
};

export default OrganisationsEdit;
