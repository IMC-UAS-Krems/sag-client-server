import { createSignal, createEffect } from "solid-js";
import type { Component } from "solid-js";

import { useNavigate } from "@solidjs/router";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@client/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@client/components/ui/tabs.tsx";
import { TextField, TextFieldErrorMessage, TextFieldInput, TextFieldLabel } from "@client/components/ui/textField.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectErrorMessage,
} from "@client/components/ui/select.tsx";
import { Skeleton } from "@client/components/ui/skeleton.tsx";
import { Button } from "@client/components/ui/button.tsx";
import { showToast } from "@client/components/ui/toast.tsx";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert.tsx";

import { eden } from "@client/api/index.ts";
import authStore from "@store/authStore.ts";
import Header from "@client/components/Header.tsx";
import styles from "@styles/Signin.module.css";

interface NavigateProps {
  navigate: ReturnType<typeof useNavigate>;
}
interface LoginErrors {
  username?: string;
  password?: string;
}

interface RegisterErrors {
  username?: string;
  password?: string;
  name?: string;
  email?: string;
  municipality?: string;
  organization?: string;
}

const ShadLogin: Component<NavigateProps> = ({ navigate }) => {
  const [username, setUsername] = createSignal<string>("");
  const [password, setPassword] = createSignal<string>("");
  const [loginErrors, setLoginErrors] = createSignal<LoginErrors>({});

  const validateField = (fieldName: "username" | "password", value: string): string | undefined => {
    if (!value) return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;

    if (fieldName === "username" && value.length < 4) return "Username must be at least 4 characters long";
    if (fieldName === "password" && value.length < 8) return "Password must be at least 8 characters long";

    return undefined;
  };

  const handleInputChange = (fieldName: "username" | "password", value: string) => {
    const error = validateField(fieldName, value);
    setLoginErrors({ ...loginErrors(), [fieldName]: error });

    if (fieldName === "username") {
      setUsername(value);
    } else {
      setPassword(value);
    }
  };

  const validateLoginForm = () => {
    setLoginErrors({
      username: validateField("username", username()),
      password: validateField("password", password()),
    });
  };

  const submit = async () => {
    validateLoginForm();
    if (Object.values(loginErrors()).some(Boolean)) {
      showToast({
        variant: "destructive",
        title: "Error",
        description: "Please fix the errors in the form",
      });
      return;
    }

    const response = await eden.auth.login.post({
      identifier: username(),
      key: password(),
      $fetch: {
        mode: "cors",
        credentials: "include",
        method: "POST",
      },
    });

    if (!response.data || response.error) {
      showToast({
        variant: "destructive",
        title: "Error",
        description: "Wrong login information",
      });
      return;
    }

    authStore.initializeAuth();
    navigate("/home", { replace: true });

    showToast({ variant: "success", title: "Success", description: "Login successful" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>You can sign in here using your username and password.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        <TextField class="space-y-1" validationState={loginErrors().username ? "invalid" : "valid"}>
          <TextFieldLabel>Username</TextFieldLabel>
          <TextFieldInput
            placeholder="John Doe"
            type="text"
            onInput={(e) => handleInputChange("username", e.currentTarget.value)}
          />
          <TextFieldErrorMessage>{loginErrors().username}</TextFieldErrorMessage>
        </TextField>
        <TextField class="space-y-1" validationState={loginErrors().password ? "invalid" : "valid"}>
          <TextFieldLabel>Password</TextFieldLabel>
          <TextFieldInput
            placeholder="password123"
            type="password"
            onInput={(e) => handleInputChange("password", e.currentTarget.value)}
          />
          <TextFieldErrorMessage>{loginErrors().password}</TextFieldErrorMessage>
        </TextField>
      </CardContent>
      <CardFooter>
        <Button onClick={submit} disabled={!username() || !password() || Object.values(loginErrors()).some(Boolean)}>
          Sign in
        </Button>
      </CardFooter>
    </Card>
  );
};

const ShadRegister: Component<NavigateProps> = ({ navigate }) => {
  const [username, setUsername] = createSignal<string>("");
  const [password, setPassword] = createSignal<string>("");
  const [name, setName] = createSignal<string>("");
  const [email, setEmail] = createSignal<string>("");
  const [municipality, setMunicipality] = createSignal<string>("");
  const [organization, setOrganization] = createSignal<string>("");
  const [registerErrors, setRegisterErrors] = createSignal<RegisterErrors>({});

  const [municipalities, setMunicipalities] = createSignal<string[]>([]);
  const [organizations, setOrganizations] = createSignal<string[]>([]);
  const [isMunicipalitiesLoading, setIsMunicipalitiesLoading] = createSignal(true);
  const [isOrganizationsLoading, setIsOrganizationsLoading] = createSignal(false);

  const handleInputChange = (
    fieldName: "username" | "password" | "name" | "email" | "municipality" | "organization",
    value: string,
  ) => {
    const error = validateField(fieldName, value);
    setRegisterErrors({ ...registerErrors(), [fieldName]: error });

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
    }
  };

  const validateField = (
    fieldName: "username" | "password" | "name" | "email" | "municipality" | "organization",
    value: string,
  ): string | undefined => {
    if (!value) return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;

    if (fieldName === "username" && value.length < 4) return "Username must be at least 4 characters long";
    if (fieldName === "password" && value.length < 8) return "Password must be at least 8 characters long";
    if (fieldName === "name" && value.length < 4) return "Name must be at least 4 characters long";
    if (fieldName === "email" && !/\S+@\S+\.\S+/.test(value)) return "Email is invalid";

    return undefined;
  };

  const validateRegisterForm = () => {
    setRegisterErrors({
      username: validateField("username", username()),
      password: validateField("password", password()),
      name: validateField("name", name()),
      email: validateField("email", email()),
      municipality: validateField("municipality", municipality()),
      organization: validateField("organization", organization()),
    });
  };

  const submit = async () => {
    validateRegisterForm();
    if (Object.values(registerErrors()).some(Boolean)) {
      showToast({
        variant: "destructive",
        title: "Error",
        description: "Please fix the errors in the form",
      });
      return;
    }

    const formName = name() ?? "";
    const formEmail = email() ?? "";
    const formUsername = username() ?? "";
    const formPassword = password() ?? "";
    const formMunicipality = municipality() ?? "";
    const formOrganization = organization() ?? "";

    try {
      const response = await eden.auth.register.post({
        name: formName,
        email: formEmail,
        username: formUsername,
        key: formPassword,
        municipalityName: formMunicipality,
        organizationName: formOrganization,
        $fetch: {
          mode: "cors",
          credentials: "include",
          method: "POST",
        },
      });

      if (response.data) {
        if ("error" in response.data && response.data.error.includes("verification email")) {
          showToast({
            variant: "warning",
            title: "Successful registration",
            description: "Registration successful, but could not send verification email, please request new link",
          });

          authStore.setState({
            isAuthenticated: true,
            email: formEmail,
            name: formName,
            userRole: "Developer",
            verified: false,
          });
          navigate("/verify", { replace: true });
          return;
        } else if ("error" in response.data && !response.data.error.includes("verification email")) {
          throw new Error("An unknown error occurred during registration.");
        }
      }

      // NOTE: At the moment default `userRole` is set to "Developer" for all new users
      authStore.setState({
        isAuthenticated: true,
        email: formEmail,
        name: formName,
        userRole: "Developer",
        verified: false,
      });

      showToast({
        variant: "success",
        title: "Successful registration",
        description: "We have sent you a verification email",
      });
      navigate("/home", { replace: true });
      return;
    } catch (error) {
      let errorMessage = "An unknown error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      showToast({
        variant: "destructive",
        title: "Unsuccessful registration",
        description: errorMessage,
      });
      return;
    }
  };

  const fetchMunicipalities = async () => {
    try {
      const response = await eden.api.municipalities.get();
      if (Array.isArray(response.data)) {
        setMunicipalities(response.data);
      } else {
        console.error("Unexpected response format:", response.data);
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
      if (Array.isArray(response.data)) {
        setOrganizations(response.data);
        if (organization()) {
          setOrganization("");
        }
      } else {
        console.error("Unexpected response format:", response.data);
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
      console.log("Fetching organizations for", municipality());
      fetchOrganizationsByMunicipality(municipality()!);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register</CardTitle>
        <CardDescription>
          You may register here, make sure to choose the right Municipality and Organization.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        <TextField class="space-y-1" validationState={registerErrors().name ? "invalid" : "valid"}>
          <TextFieldLabel>Name</TextFieldLabel>
          <TextFieldInput placeholder="John Doe" onInput={(e) => handleInputChange("name", e.currentTarget.value)} />
          {registerErrors().name && <TextFieldErrorMessage>{registerErrors().name}</TextFieldErrorMessage>}
        </TextField>
        <TextField class="space-y-1" validationState={registerErrors().email ? "invalid" : "valid"}>
          <TextFieldLabel>Email</TextFieldLabel>
          <TextFieldInput
            placeholder="john@doe.com"
            type="email"
            onInput={(e) => handleInputChange("email", e.currentTarget.value)}
          />
          {registerErrors().email && <TextFieldErrorMessage>{registerErrors().email}</TextFieldErrorMessage>}
        </TextField>
        <TextField class="space-y-1" validationState={registerErrors().username ? "invalid" : "valid"}>
          <TextFieldLabel>Username</TextFieldLabel>
          <TextFieldInput
            placeholder="johndoe55"
            onInput={(e) => handleInputChange("username", e.currentTarget.value)}
          />
          {registerErrors().username && <TextFieldErrorMessage>{registerErrors().username}</TextFieldErrorMessage>}
        </TextField>
        <TextField class="space-y-1" validationState={registerErrors().password ? "invalid" : "valid"}>
          <TextFieldLabel>Password</TextFieldLabel>
          <TextFieldInput
            placeholder="password123"
            type="password"
            onInput={(e) => handleInputChange("password", e.currentTarget.value)}
          />
          {registerErrors().password && <TextFieldErrorMessage>{registerErrors().password}</TextFieldErrorMessage>}
        </TextField>
        <Select
          value={municipality()}
          onChange={(selectedValue) => {
            if (!selectedValue) return;
            handleInputChange("municipality", selectedValue);
            console.log("Municipality selected:", selectedValue);
          }}
          options={municipalities()}
          placeholder="Select a municipality…"
          itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
          validationState={registerErrors().municipality ? "invalid" : "valid"}
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
                {registerErrors().password && <SelectErrorMessage>{registerErrors().municipality}</SelectErrorMessage>}
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
          validationState={registerErrors().organization ? "invalid" : "valid"}
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
                {registerErrors().password && <SelectErrorMessage>{registerErrors().organization}</SelectErrorMessage>}
              </>
            )}
          </div>
        </Select>
      </CardContent>
      <CardFooter>
        <Button
          onClick={submit}
          disabled={
            Object.values(registerErrors()).some(Boolean) ||
            !username() ||
            !password() ||
            !email() ||
            !name() ||
            !municipality() ||
            !organization()
          }
        >
          Register
        </Button>
      </CardFooter>
    </Card>
  );
};

const SignIn: Component = () => {
  const navigate = useNavigate();

  return (
    <Header>
      <main class={styles["signin-main-container"]}>
        {authStore.state().isAuthenticated ? (
          <Alert variant="destructive">
            {/* <IconTerminal /> */}
            <AlertTitle>Already logged in!</AlertTitle>
            <AlertDescription>You are already logged in as {authStore.state().name}</AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="account" class="w-[400px]">
            <TabsList class="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <ShadLogin navigate={navigate} />
            </TabsContent>
            <TabsContent value="register">
              <ShadRegister navigate={navigate} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </Header>
  );
};

export default SignIn;
