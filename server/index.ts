import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cookie } from "@elysiajs/cookie";
import { jwt } from "@elysiajs/jwt";
import { cors } from "@elysiajs/cors";
import { prisma } from "@∆";
import { TSchema } from "@sinclair/typebox";

const app = new Elysia()
	.use(cors())
	.use(swagger())
	.use(
		jwt<
			"jwt",
			TSchema & {
				role: "admin" | "user";
			}
		>({
			name: "jwt",
			secret: "steadying-helper-outbound-haggler",
			exp: "7d",
		}),
	)
	.use(cookie())
	.get("/", ({ set }) => {
		console.log("Got invoked");
		set.status = 200;
		return "Hello Elysia";
	})
	.post("/logout", ({ jwt, cookie, setCookie }) => {
		// Validate user + jwt
		return "Logged out";
	})
	.post(
		"/register",
		({ jwt, cookie, setCookie, body }) => {
			// Validate user + jwt

			return `Registered ${body.username}`;
		},
		{
			body: t.Object({
				username: t.String(),
				password: t.String({
					minLength: 8,
				}),
			}),
		},
	)
	.post(
		"/login",
		({ jwt, cookie, setCookie, body }) => {
			// Validate user + jwt
			return `Logged in ${body.username}`;
		},
		{
			body: t.Object({
				username: t.String(),
				password: t.String({
					minLength: 8,
				}),
			}),
		},
	)
	.post(
		"/compile",
		({ jwt, cookie, setCookie, body }) => {
			return `Compiled ${body.file}`;
		},
		{
			// Validate JWT
			body: t.Object({
				file: t.String(),
			}),
		},
	)
	.listen(3000);

export type Router = typeof app;

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

const T = async () => {
	const users = await prisma.user.findMany();
};
