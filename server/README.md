# Web Server Client - Server

This is the server specific README of this project, make sure you first read the [overall documentation](../README.md).

## Get started

The server can be both run via its Docker service or manually via Bun / Vite.

To run via Docker run the following in the root directory:

```bash
docker compose up server
```

However, on this individual level it is more recommended to run it directly to allow hot-reloading:

```bash
bun run server
```

For this however you will need to have installed the neccessary modules via `bun install`.

It is recommended that you also utilize the bulit in Swagger interface for quicker endpoint scaffolding, once you run the server it can be found at: http://localhost:9512/docs

> [!NOTE]  
> As for the project generally you will need the `.env` file here to be present in the root directory.

## Documentation

Here are the docs for the main technologies used:

- [Bun](https://bun.sh/docs)
- [ElysiaJS](https://elysiajs.com/integrations/cheat-sheet)
- [Prisma](https://www.prisma.io/docs)

## Working with the server - structure

There are four main parts you need to be aware of to get started:

- `index.ts` - the main entry point, server setup
- `./routes` - defining the endpoints of the server
- `sql.ts` - interaction logic with the database
- Misc - `middleware.ts`, `types.ts`, `prisma.ts`...

### [index.ts](./index.ts)

The main entry point of the server, responsible for setting up capabilities of the server from logging and CORS settings to middlewares actual routes.

Here you would typically use the functions `.use`, `.resolve` and the alike, extending the base functionality.

#### Adding routes

You can create route definitions in the [routes directory](./routes/), export those definitions and simply use them in the `index.ts` file to let the server know they exist. E.g.:

```TS
import { auth } from "@server/routes/auth.ts";
import { api } from "@server/routes/api.ts";
import { admin } from "@server/routes/admin.ts";

  .use(auth)
  .use(admin)
  .use(api)
```

#### Adding middlewares - Authenticiation

You may see that we already have a `.resolve` function in the server definition, it is our main authentication middleware. [Check this out](https://beta.elysiajs.com/life-cycle/before-handle#resolve) to learn more about Elysia's resolve function, however in a nutshell it is a function that runs before handling the incoming request by the user.

Our solution is to using this middleware either deconstruct a header bearer token or cookie JWT token that allows us to authenticate the user. We use stateless authentication, meaning all authentication is managed via the passing and decrypting of JWT secrets that have a set expiry time.

The resolve function then attaches to the request context the user's ID it deconstructs from the token. We can in our routes then use this ID to check if the user is actually permitted for the action taken. This is done via a middleware which I will describe more in detail at the [Misc](#misc) section.

### [./routes](./routes/)

The routes directory holds the definitions for the endponts of the server. Generally here you would create an Elysia definition with a prefix that matches the files's name in case of brand new endpoint categories, otherwise work in the already defined ones.

To define endpoints you can simply use the `.get`, `.post`, `.put`, `.delete` functions, then give a name to the endpoint, define what to destructure from the query context, then comes the function logic.

Don't forget to document the input types and the function after the logic, as with Elysia it also acts as a validator for the input and makes working with Swagger easier.

### [sql.ts](./sql.ts)

This is a huge monolithic file holding all the logic that uses Prisma queries, interacting with the database. Generally the pattern is you would create an endpoint, destructure and validate some of the needed information there, then in a try-catch block pass it to the `sql.ts` function interacting with the DB.

If there is any errors you can then throw it in `sql.ts`, catch it in the endpoint and send back the appropriate error code and message. Don't forget to define the status code via `set` from the context, `log` can be used to log to the client's console remotely.

### Misc

Here are some other noteworthy files:

#### [middleware.ts](./middleware.ts) - Authentication

This serves as the middleware definition file of the server. So far we only use this for our authentication middleware in tandem with the `.resolve` function defined in the [index.ts](#indexts) section.

It takes in as input the `set` and `userId` from the request context, then checks whether the user has the specific level of access for that endpoint. Middlewares can be run on individual endpoints too, but in this case you can see for example at the beginning of [api.ts](./routes/api.ts) that it is being used for the whole endpoint / any route defined that comes after it.

```ts
  .onBeforeHandle(async (context) => {
    return await authMiddleware(
      {
        set: context.set,
        userId: context.userId,
      },
      { requireAdmin: true },
    );
  })
```

#### (prisma.ts)

Sets up and exports the Prisma client used for interacting with the database.

#### [types.ts](./types.ts) - [errors.ts](./errors.ts)

Self-explanatory naming, here defines and export types used across the backend. There is a similar file for defining custom error types as well.
