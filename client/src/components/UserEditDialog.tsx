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
import { UpdateUserBody } from "@server/types.ts";
import { UserRole } from "@utils/roles.ts";

export default function UserEditDialog(userId) {
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

  const [oldName, setOldName] = createSignal<string | undefined>(undefined);
  const [oldEmail, setOldEmail] = createSignal<string | undefined>(undefined);
  const [oldUsername, setOldUsername] = createSignal<string | undefined>(undefined);
  // const [oldMunicipality, setOldMunicipality] = createSignal<string | undefined>(undefined);
  // const [oldOrganization, setOldOrganization] = createSignal<string | undefined>(undefined);
  // const [oldUserRole, setOldUserRole] = createSignal<UserRole | string | undefined>(undefined);
  const [userFetchError, setUserFetchErrors] = createSignal<string | null>(null);

  const [loading, setLoading] = createSignal(true);
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
        // setOldMunicipality(oldUserData.data.municipalityName);
        // setOldOrganization(oldUserData.data.organizationName);
        // setOldUserRole(oldUserData.data.userRole);
        setMunicipality(oldUserData.data.municipalityName);
        setOrganization(oldUserData.data.organizationName);
        setUserRole(oldUserData.data.userRole);
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
        showToast({
          variant: "error",
          title: "Error",
          description: updated.data?.error || "Error updating user",
        });
        return;
      }

      navigate("/users", { replace: true });
      showToast({
        variant: "success",
        title: "Success",
        description: "User details updated successfully",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      showToast({
        variant: "error",
        title: "Error",
        description: `Error updating user: ${error}`,
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger class="w-full text-start cursor-pointer">✏️ Edit</DialogTrigger>
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User {userId}</DialogTitle>
          <DialogDescription>You may edit attributes of the user here.</DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <TextField class="space-y-1" validationState={errors().name ? "invalid" : "valid"}>
            <TextFieldLabel>Name</TextFieldLabel>
            <TextFieldInput
              placeholder={oldName() || "Old name"}
              onInput={(e) => handleInputChange("name", e.currentTarget.value)}
            />
            {errors().name && <TextFieldErrorMessage>{errors().name}</TextFieldErrorMessage>}
          </TextField>
          <TextField class="space-y-1" validationState={errors().email ? "invalid" : "valid"}>
            <TextFieldLabel>Email</TextFieldLabel>
            <TextFieldInput
              placeholder={oldEmail() || "Old email"}
              type="email"
              onInput={(e) => handleInputChange("email", e.currentTarget.value)}
            />
            {errors().email && <TextFieldErrorMessage>{errors().email}</TextFieldErrorMessage>}
          </TextField>
          <TextField class="space-y-1" validationState={errors().username ? "invalid" : "valid"}>
            <TextFieldLabel>Username</TextFieldLabel>
            <TextFieldInput
              placeholder={oldUsername() || "Old username"}
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
            placeholder={!organizations().length ? "No organization found for municipality" : "Select an organization…"}
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
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={Object.values(errors()).some(Boolean)}>
            Edit User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
