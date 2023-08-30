import { type Component, createSignal } from "solid-js";
import { useI18n } from "@solid-primitives/i18n";
import { TextField, Button } from "@kobalte/core";
import { eden } from "@client/api";
import type { Accessor, Setter } from "solid-js";

const FormField: Component<{
	getter: Accessor<string | undefined>;
	setter: Setter<string | undefined>;
	labelText: string;
	password?: boolean;
}> = ({ getter, setter, labelText, password }) => {
	return (
		<TextField.Root value={getter()} onChange={setter}>
			<TextField.Label>{labelText}</TextField.Label>
			<TextField.Input type={password ? "password" : "text"} />
		</TextField.Root>
	);
};

const Register: Component = () => {
	const [t, { add, locale, dict }] = useI18n();

	const [name, setName] = createSignal<string | undefined>(undefined);
	const [email, setEmail] = createSignal<string | undefined>(undefined);
	const [username, setUsername] = createSignal<string | undefined>(undefined);
	const [password, setPassword] = createSignal<string | undefined>(undefined);
	const [municipality, setMunicipality] = createSignal<string | undefined>(
		undefined,
	);
	const [organisation, setOrganisation] = createSignal<string | undefined>(
		undefined,
	);

	const submit = async () => {
		const formName = name();
		const formEmail = email();
		const formUsername = username();
		const formPassword = password();
		const formMunicipality = municipality();
		const formOrganisation = organisation();

		if (!(formName && formEmail && formUsername && formPassword)) {
			console.log("Invalid data");
			return;
		}

		const registered = await eden.auth.register.post({
			name: formName,
			email: formEmail,
			username: formUsername,
			password: formPassword,
			municipality: formMunicipality,
			organisation: formOrganisation,
		});

		if (!registered || registered.error) {
			console.log(registered.error);
			return;
		}

		console.log(
			`Registration successful. Welcome ${registered.data.data?.name}.`,
		);
	};

	return (
		<>
			<form>
				<FormField getter={name} setter={setName} labelText="Name" />
				<FormField getter={email} setter={setEmail} labelText="Email" />
				<FormField
					getter={username}
					setter={setUsername}
					labelText="Username"
				/>
				<FormField
					getter={password}
					setter={setPassword}
					labelText="Password"
					password={true}
				/>
				<FormField
					getter={municipality}
					setter={setMunicipality}
					labelText="Municipality"
				/>
				<FormField
					getter={organisation}
					setter={setOrganisation}
					labelText="Organisation"
				/>
			</form>
			<Button.Root onClick={submit}>Submit</Button.Root>
		</>
	);
};

const Login: Component = () => {
	const [t, { add, locale, dict }] = useI18n();

	const [username, setUsername] = createSignal<string | undefined>(undefined);
	const [password, setPassword] = createSignal<string | undefined>(undefined);

	const submit = async () => {
		const formUsername = username();
		const formPassword = password();

		if (!(formUsername && formPassword)) {
			console.log("Invalid data");
			return;
		}

		const logged = await eden.auth.login.post({
			username: formUsername,
			password: formPassword,
		});

		if (!logged || logged.error) {
			console.log(logged.error);
			return;
		}

		console.log(`Login successful. Welcome ${logged.data.data?.name}.`);
	};

	return (
		<>
			<form>
				<FormField
					getter={username}
					setter={setUsername}
					labelText="Username"
				/>
				<FormField
					getter={password}
					setter={setPassword}
					labelText="Password"
					password={true}
				/>
			</form>
			<Button.Root onClick={submit}>Submit</Button.Root>
		</>
	);
};

const SignIn: Component = () => {
	const [mode, setMode] = createSignal<"login" | "register">("login");
	const [t, { add, locale, dict }] = useI18n();

	return (
		<>
			{mode() === "login" ? <Login /> : <Register />}
			<Button.Root
				onClick={() => setMode(mode() === "login" ? "register" : "login")}
			>
				{mode() === "login" ? "Register" : "Login"}
			</Button.Root>
		</>
	);
};

export default SignIn;
