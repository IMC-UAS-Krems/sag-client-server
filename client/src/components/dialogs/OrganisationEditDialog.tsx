import { createSignal, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@client/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectErrorMessage,
} from "@client/components/ui/select.tsx";
import { TextField, TextFieldErrorMessage, TextFieldInput, TextFieldLabel } from "@client/components/ui/textField.tsx";
import { showToast } from "@client/components/ui/toast.tsx";
import { Skeleton } from "@client/components/ui/skeleton.tsx";
import { Button } from "@client/components/ui/button.tsx";
import { eden } from "@client/api/index.ts";
import { handleUnauthorized } from "@client/utils/authUtils.ts";
import { UpdateOrganisationBody } from "@server/types.ts";
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from "@client/components/ui/switch.tsx";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert.tsx";
import { IoAlertCircleOutline } from "solid-icons/io";
import { TbLoader2 } from "solid-icons/tb";

interface OrganisationEditDialogProps {
  organisationId: string;
  fetchOrganisations: () => void;
}

export default function OrganisationEditDialog(props: OrganisationEditDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  const [loadingRequest, setLoadingRequest] = createSignal(false);

  const [organisationName, setOrganisationName] = createSignal<string | undefined>(undefined);
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
  const [municipalityFetchError, setMunicipalityFetchError] = createSignal<string | null>(null);
  const [errors, setErrors] = createSignal<{ [key: string]: string | undefined }>({});
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
          organisationId: props.organisationId,
        },
      });

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
      setMunicipalityFetchError("Error fetching municipalities");
    } finally {
      setIsMunicipalitiesLoading(false);
    }
  };

  createEffect(() => {
    fetchOrganisationData().then(() => {
      fetchMunicipalities();
    });
  });

  const validateField = (
    fieldName: "organisationName" | "organisationDescription" | "municipalityName" | "verified",
    value: string | undefined | boolean,
  ): string | undefined => {
    if (typeof value === "string") {
      if (value === "") return undefined;
      if (fieldName === "organisationName" && value.length < 4)
        return "Organisation name must be at least 4 characters long";
      if (fieldName === "organisationDescription" && value.length < 8)
        return "Organisation description must be at least 8 characters long";
    } else if (fieldName === "verified" && typeof value === "boolean") {
      if (verified() === undefined && oldVerified() === undefined) return "Verified status is required";
    }

    return undefined;
  };

  const validateForm = () => {
    setErrors({
      organisationName: validateField("organisationName", organisationName()),
      organisationDescription: validateField("organisationDescription", organisationDescription()),
      municipalityName: validateField("municipalityName", municipalityName()),
      verified: validateField("verified", verified()),
    });
  };

  const hasChanged = () => {
    const orgChanged = organisationName() && oldOrganisationName() !== organisationName();
    const descChanged = organisationDescription() && oldDescription() !== organisationDescription();
    const munChanged = municipalityName() && oldMunicipalityName() !== municipalityName();
    const verChanged = verified() !== undefined && verified() !== oldVerified();
    return orgChanged || descChanged || munChanged || verChanged;
  };

  const handleInputChange = (
    fieldName: "organisationName" | "organisationDescription" | "municipalityName" | "verified",
    value: string | undefined | boolean,
  ) => {
    const error = validateField(fieldName, value);
    setErrors({ ...errors(), [fieldName]: error });

    if (typeof value === "boolean") {
      setVerified(value);
      return;
    }
    switch (fieldName) {
      case "organisationName":
        setOrganisationName(value);
        break;
      case "organisationDescription":
        setOrganisationDescription(value);
        break;
      case "municipalityName":
        setMunicipalityName(value);
        break;
    }
  };

  const submit = async () => {
    validateForm();
    if (Object.values(errors()).some(Boolean)) {
      showToast({
        variant: "error",
        title: "Error",
        description: "Please fix the errors in the form",
      });
      return;
    }

    const requestBody: UpdateOrganisationBody = {
      id: props.organisationId,
      ...(organisationName() !== undefined ? { name: organisationName() } : {}),
      ...(organisationDescription() !== undefined ? { description: organisationDescription() } : {}),
      ...(municipalityName() !== undefined ? { municipalityName: municipalityName() } : {}),
      ...(verified() !== undefined ? { verified: verified() } : {}),
      updatedAt: new Date(),
    };

    setLoadingRequest(true);
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
        showToast({
          variant: "error",
          title: "Error",
          description: updated.data?.error || "Error updating Organisation",
        });
        return;
      }

      props.fetchOrganisations();
      showToast({
        variant: "success",
        title: "Successs",
        description: "Organisation updated successfully",
      });
      setOpen(false);
    } catch (error) {
      console.error("Error updating organisation:", error);
      showToast({
        variant: "error",
        title: "Error",
        description: `Error updating organisation: ${error}`,
      });
    } finally {
      setLoadingRequest(false);
    }
  };

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger class="w-full text-start cursor-pointer">✏️ Edit</DialogTrigger>
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Organisation</DialogTitle>
          <DialogDescription>
            You may edit the details of the organisation below. Please ensure the details are correct before submitting.
          </DialogDescription>
        </DialogHeader>
        {loading() ? (
          <Skeleton height={40} radius={8} />
        ) : organisationFetchError() || municipalityFetchError() ? (
          <Alert variant="destructive">
            <IoAlertCircleOutline class="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{organisationFetchError() || municipalityFetchError()}</AlertDescription>
            <AlertDescription>Plesase try again later, or contact us if the problem persists.</AlertDescription>
          </Alert>
        ) : (
          <div class="space-y-4">
            <TextField class="space-y-1" validationState={errors().organisationName ? "invalid" : "valid"}>
              <TextFieldLabel>Organisation name</TextFieldLabel>
              <TextFieldInput
                placeholder={oldOrganisationName() || "Organisation name here..."}
                onInput={(e) => handleInputChange("organisationName", e.currentTarget.value)}
              />
              {errors().organisationName && <TextFieldErrorMessage>{errors().organisationName}</TextFieldErrorMessage>}
            </TextField>
            <TextField class="space-y-1" validationState={errors().organisationDescription ? "invalid" : "valid"}>
              <TextFieldLabel>Organisation description</TextFieldLabel>
              <TextFieldInput
                placeholder={oldDescription() || "Organisation description here..."}
                onInput={(e) => handleInputChange("organisationDescription", e.currentTarget.value)}
              />
              {errors().organisationDescription && (
                <TextFieldErrorMessage>{errors().organisationDescription}</TextFieldErrorMessage>
              )}
            </TextField>
            <Select
              value={municipalityName()}
              onChange={(selectedValue) => {
                if (!selectedValue) return;
                handleInputChange("municipalityName", selectedValue);
              }}
              options={municipalities()}
              placeholder={oldMunicipalityName() || "Select a municipality…"}
              itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
              validationState={errors().municipality ? "invalid" : "valid"}
              modal={true}
            >
              <SelectLabel>Municipality</SelectLabel>
              <div class="mt-1">
                {isMunicipalitiesLoading() ? (
                  <>
                    <Skeleton height={40} radius={8} />
                  </>
                ) : (
                  <>
                    <SelectTrigger aria-label="Municipalities">
                      <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                    </SelectTrigger>
                    <SelectContent />
                    {errors().municipality && <SelectErrorMessage>{errors().municipality}</SelectErrorMessage>}
                  </>
                )}
              </div>
            </Select>
            <Switch
              checked={verified()}
              onChange={() => {
                if (verified() === undefined) {
                  handleInputChange("verified", !oldVerified());
                  // setVerified(!oldVerified());
                } else {
                  handleInputChange("verified", !verified());
                  // setVerified(!verified());
                }
              }}
              defaultChecked={oldVerified()}
              class="flex flex-col gap-2"
            >
              <SwitchLabel>Verfied</SwitchLabel>
              <SwitchControl>
                <SwitchThumb />
              </SwitchControl>
            </Switch>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={
              Object.values(errors()).some(Boolean) ||
              !hasChanged() ||
              Boolean(organisationFetchError()) ||
              Boolean(municipalityFetchError()) ||
              loadingRequest()
            }
          >
            {loadingRequest() && <TbLoader2 class="animate-spin" />}
            Edit Organisation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
