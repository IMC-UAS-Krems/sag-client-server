import { createSignal, createEffect } from "solid-js";
import type { Component } from "solid-js";
import { useNavigate, A } from "@solidjs/router";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectErrorMessage,
} from "@client/components/ui/select.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@client/components/ui/card.tsx";
import { TextField, TextFieldErrorMessage, TextFieldInput, TextFieldLabel } from "@client/components/ui/textField.tsx";
import { showToast } from "@client/components/ui/toast.tsx";
import { Skeleton } from "@client/components/ui/skeleton.tsx";
import { Button } from "@client/components/ui/button.tsx";
import { eden } from "@client/api/index.ts";
import { handleUnauthorized } from "@client/utils/authUtils.ts";
import { UserRole } from "@utils/roles.ts";
import Header from "@client/components/Header.tsx";

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
  const [errors, setErrors] = createSignal<{ [key: string]: string | undefined }>({});

  const [isMunicipalitiesLoading, setIsMunicipalitiesLoading] = createSignal(true);
  const [isOrganizationsLoading, setIsOrganizationsLoading] = createSignal(false);

  const validateField = (
    fieldName: "username" | "password" | "name" | "email" | "municipality" | "organization" | "userRole",
    value: string | undefined,
  ): string | undefined => {
    if (!value) return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;

    if (fieldName === "username" && value.length < 4) return "Username must be at least 4 characters long";
    if (fieldName === "password" && value.length < 8) return "Password must be at least 8 characters long";
    if (fieldName === "name" && value.length < 4) return "Name must be at least 4 characters long";
    if (fieldName === "email" && !/\S+@\S+\.\S+/.test(value)) return "Email is invalid";

    return undefined;
  };

  const validateForm = () => {
    setErrors({
      username: validateField("username", username()),
      password: validateField("password", password()),
      name: validateField("name", name()),
      email: validateField("email", email()),
      municipality: validateField("municipality", municipality()),
      organization: validateField("organization", organization()),
      userRole: validateField("userRole", userRole()),
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
    fieldName: "username" | "password" | "name" | "email" | "municipality" | "organization" | "userRole",
    value: string,
  ) => {
    const error = validateField(fieldName, value);
    setErrors({ ...errors(), [fieldName]: error });

    switch (fieldName) {
      case "username":
        setUsername(value);
        break;
      case "password":
        setPassword(value);
        break;
      case "name":
        setName(value);
        break;
      case "email":
        setEmail(value);
        break;
      case "municipality":
        setMunicipality(value);
        break;
      case "organization":
        setOrganization(value);
        break;
      case "userRole":
        setUserRole(value as UserRole);
        break;
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
      showToast({
        variant: "error",
        title: "Error",
        description: "An error occurred while fetching organizations",
      });
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

  const submit = async () => {
    validateForm();
    if (Object.values(errors()).some(Boolean)) {
      showToast({
        variant: "destructive",
        title: "Error",
        description: "Please fix the errors in the form",
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

      navigate("/users", { replace: true });
      showToast({
        variant: "success",
        title: "Success",
        description: "The user has been created successfully",
      });
    } catch (error) {
      console.error("Error creating user:", error);

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
    <Header>
      <main>
        <Card class="w-2xl mx-auto mt-5">
          <CardHeader>
            <CardTitle>Users Create</CardTitle>
            <CardDescription>
              You may create a new user here. Make sure to pick the approporiate user role.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-2">
            <TextField class="space-y-1" validationState={errors().name ? "invalid" : "valid"}>
              <TextFieldLabel>Name</TextFieldLabel>
              <TextFieldInput
                placeholder="John Doe"
                onInput={(e) => handleInputChange("name", e.currentTarget.value)}
              />
              {errors().name && <TextFieldErrorMessage>{errors().name}</TextFieldErrorMessage>}
            </TextField>
            <TextField class="space-y-1" validationState={errors().email ? "invalid" : "valid"}>
              <TextFieldLabel>Email</TextFieldLabel>
              <TextFieldInput
                placeholder="john@doe.com"
                type="email"
                onInput={(e) => handleInputChange("email", e.currentTarget.value)}
              />
              {errors().email && <TextFieldErrorMessage>{errors().email}</TextFieldErrorMessage>}
            </TextField>
            <TextField class="space-y-1" validationState={errors().username ? "invalid" : "valid"}>
              <TextFieldLabel>Username</TextFieldLabel>
              <TextFieldInput
                placeholder="johndoe55"
                onInput={(e) => handleInputChange("username", e.currentTarget.value)}
              />
              {errors().username && <TextFieldErrorMessage>{errors().username}</TextFieldErrorMessage>}
            </TextField>
            <TextField class="space-y-1" validationState={errors().password ? "invalid" : "valid"}>
              <TextFieldLabel>Password</TextFieldLabel>
              <TextFieldInput
                placeholder="password123"
                type="password"
                onInput={(e) => handleInputChange("password", e.currentTarget.value)}
              />
              {errors().password && <TextFieldErrorMessage>{errors().password}</TextFieldErrorMessage>}
            </TextField>
            <Select
              value={municipality()}
              onChange={(selectedValue) => {
                if (!selectedValue) return;
                if (municipality() !== selectedValue && organization()) {
                  console.log("Resetting organization");
                  setOrganizations([]);
                  setOrganization(undefined);
                }
                handleInputChange("municipality", selectedValue);
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
                    {errors().password && <SelectErrorMessage>{errors().municipality}</SelectErrorMessage>}
                  </>
                )}
              </div>
            </Select>
            <Select
              value={organization()}
              onChange={(selectedValue) => {
                if (!selectedValue) return;
                handleInputChange("organization", selectedValue);
                console.log("Organization selected:", selectedValue);
              }}
              options={organizations()}
              placeholder={
                !organizations().length ? "No organization found for municipality" : "Select an organization…"
              }
              itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
              disabled={isOrganizationsLoading() || !municipality() || !organizations().length}
              validationState={errors().organization ? "invalid" : "valid"}
            >
              <SelectLabel>Organization</SelectLabel>
              <div class="mt-1">
                {isOrganizationsLoading() ? (
                  <>
                    <Skeleton height={40} radius={8} />
                  </>
                ) : (
                  <>
                    <SelectTrigger aria-label="Organizations">
                      <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                    </SelectTrigger>
                    <SelectContent />
                    {errors().password && <SelectErrorMessage>{errors().organization}</SelectErrorMessage>}
                  </>
                )}
              </div>
            </Select>
            <Select
              value={userRole()}
              onChange={(selectedValue) => {
                if (!selectedValue) return;
                handleInputChange("userRole", selectedValue);
                console.log("Organization selected:", selectedValue);
              }}
              options={Object.values(UserRole)}
              itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
              validationState={errors().userRole ? "invalid" : "valid"}
              placeholder="Select a user role…"
            >
              <SelectLabel>User Role</SelectLabel>
              <div class="mt-1">
                <SelectTrigger aria-label="Organizations">
                  <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                </SelectTrigger>
                <SelectContent />
                {errors().userRole && <SelectErrorMessage>{errors().userRole}</SelectErrorMessage>}
              </div>
            </Select>
          </CardContent>
          <CardFooter class="space-x-2">
            <Button
              onClick={submit}
              disabled={
                Object.values(errors()).some(Boolean) ||
                !username() ||
                !password() ||
                !email() ||
                !name() ||
                !municipality() ||
                !organization() ||
                !userRole()
              }
            >
              Register
            </Button>
            <Button as={A} href="/users" variant="secondary">
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </main>
    </Header>
  );
};

export default UsersCreate;
