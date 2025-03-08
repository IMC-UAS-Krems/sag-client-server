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

interface OrganisationCreateDialogProps {
  fetchOrganisations: () => void;
}

export default function OrganisationCreateDialog(props: OrganisationCreateDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);

  const [organisationName, setOrganisationName] = createSignal<string | undefined>(undefined);
  const [organisationDescription, setOrganisationDescription] = createSignal<string | undefined>(undefined);
  const [municipalityName, setMunicipalityName] = createSignal<string | undefined>(undefined);

  const [municipalities, setMunicipalities] = createSignal<string[]>([]);
  const [isMunicipalitiesLoading, setIsMunicipalitiesLoading] = createSignal(true);
  const [errors, setErrors] = createSignal<{ [key: string]: string | undefined }>({});

  const validateField = (
    fieldName: "organisationName" | "organisationDescription" | "municipalityName",
    value: string | undefined,
  ): string | undefined => {
    if (!value) return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;

    if (fieldName === "organisationName" && value.length < 4)
      return "Organisation name must be at least 4 characters long";
    if (fieldName === "organisationDescription" && value.length < 8)
      return "Organisation description must be at least 8 characters long";

    return undefined;
  };

  const validateForm = () => {
    setErrors({
      organisationName: validateField("organisationName", organisationName()),
      organisationDescription: validateField("organisationDescription", organisationDescription()),
      municipalityName: validateField("municipalityName", municipalityName()),
    });
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

  const handleInputChange = (
    fieldName: "organisationName" | "organisationDescription" | "municipalityName",
    value: string | undefined,
  ) => {
    const error = validateField(fieldName, value);
    setErrors({ ...errors(), [fieldName]: error });

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

  createEffect(() => {
    fetchMunicipalities();
  });

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

      showToast({
        variant: "success",
        title: "Success",
        description: "Organisation successfully created",
      });
      props.fetchOrganisations();
      setOpen(false);
    } catch (error) {
      console.error("Error creating organisation:", error);

      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      showToast({
        variant: "error",
        title: "Error",
        description: errorMessage,
      });
    }
  };

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger as={Button<"button">}>Create new organisation</DialogTrigger>
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create new Organisation</DialogTitle>
          <DialogDescription>
            You may create a new organisation here. Note that these organisations are verified by default.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <TextField class="space-y-1" validationState={errors().organisationName ? "invalid" : "valid"}>
            <TextFieldLabel>Organisation name</TextFieldLabel>
            <TextFieldInput
              placeholder="Organisation name here..."
              onInput={(e) => handleInputChange("organisationName", e.currentTarget.value)}
            />
            {errors().organisationName && <TextFieldErrorMessage>{errors().organisationName}</TextFieldErrorMessage>}
          </TextField>
          <TextField class="space-y-1" validationState={errors().organisationDescription ? "invalid" : "valid"}>
            <TextFieldLabel>Organisation description</TextFieldLabel>
            <TextFieldInput
              placeholder="Organisation description here..."
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
            placeholder="Select a municipality…"
            itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
            validationState={errors().municipality ? "invalid" : "valid"}
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
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={
              Object.values(errors()).some(Boolean) ||
              !organisationName() ||
              !organisationDescription() ||
              !municipalityName()
            }
          >
            Create Organisation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
