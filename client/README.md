# Web Server Client - Client

This is the client specific README of this project, make sure you first read the [overall documentation](../README.md).

## Get started

The client can be both run via its Docker service or manually via Bun / Vite.

To run via Docker run the following in the root directory:

```bash
docker compose up client
```

However, on this individual level it is more recommended to run it directly to allow hot-reloading:

```bash
bun run dev
```

For this however you will need to have installed the neccessary modules via `bun install`.

At the moment the port number depends on how you start it:

- Docker: http://localhost:80
- Manual: http://localhost:4000

> [!NOTE]  
> As for the project generally you will need the `.env` file here to be present in the root directory.

## Documentation

Here are the docs for the main technologies used:

- [Solid](https://docs.solidjs.com/) - Frontend framework
- [Tailwind](https://tailwindcss.com/docs/installation/using-vite) - Styling library (4.0 sepcifically)
- Component libraries - we opted to use Shadcn, which behind the scenes uses Kobalte and other great libraries, but it has no official Solid port yet, so here are the alternatives that can be used
  - [SolidUI](https://www.solid-ui.com/) - Shadcn port, manually install - preferred library
  - [shadcn-solid](https://shadcn-solid.com/) - SolidUI alternative with some different components available
  - [Kobalte](https://kobalte.dev/docs/core/overview/introduction) - As the previous two use Kobalte behind the scenes, you can find some proper documentation here, plus other components you may not be able to find with the previous ports
- [Codemirror](https://codemirror.net/docs/ref/#view.EditorView%5Etheme) - The code editor

## Working with the client - structure

Everything is held in the [./src](./src) folder. Then things are logically arranged inside their own folders except for [App.tsx](./src/App.tsx) and [index.tsx](./src/index.tsx) which are the entry point of the application. Here you could set up application wide wrappers. (E.g. `EditorProcvider`, `Toaster`)

Working with Solid is pretty simple, it is quite alike many of the other React-like frameworks out there, you will find an alternative for almost any built in React functionality, like e.g. `createSignal` instead of `useState` or `createEffect` instead of `useEffect`. Syntax-wise though, Solid does have its own pecularities.

### [./routes](./src/routes/)

Defines what the routes should render importing components and consuming contexts, then [DRoutes.tsx](./src/components/DRoutes.tsx) component imports these funcitons, defining the actual path mappings, and how if any of the paths should be protected / authenticated via the [authGuard.tsx](./src/guard/authGuard.tsx).

### [./components](./src/components)

These are semi-reusable components utilized throughout the application. The `./ui` folder holds the specific reusable `.ui` components and manually installed components from Shadcn meanwhilw the outer directory stores larger components. The `./dialogs` directory specifically holds `dialog` components and dialog builders both with built in triggers and externally managed ones.

### [./contexts](./src/contexts/) - [./store](./src/store/)

Stores / context for the application to share a common context between components beneath, avoiding prop drilling. To read more on the concept read up on it [here in the docs](https://docs.solidjs.com/concepts/context).

### [./styles](./src/styles/)

Stores the CSS files for the application. Since we have moved to Tailwind v4, there is no more need for separate CSS files, we just use Tailwind for styling components. The reason is with the latest update, Tailwind now supports any arbitrary value to be added to styles.

The `index.css` file holds the setup styles for our Shadcn components and Tailwind itself. Here you can create, modify CSS variables or even add Tailwind plugins.

### Misc - Auth guard, API, Codemirror

Some other noteworthy things to mention.

#### Auth guard

The authentication guard can be found in the file [authGuard.tsx](./src/guard/authGuard.tsx). This is used in [DRoutes.tsx](./src/components/DRoutes.tsx) to only allow authenticated users to access part of the application.

#### API

The [api file](./src/api/index.ts) sets up the connection with the backend server, this `eden` instance is how we communicate with the backend through fetches. Generally: `await eden.[endpoint definition name, e.g. admin].users.get(...)`.

#### Codemirror - Code editor

The code editor is one of the main parts of the frontend and it spans the `Editor.tsx` main component, `editor.tsx` context, multiple components, dialog components and even [editor_plugins](./src/editor_plugins/) for Codemirror.

## Deployment with Solid

To create the production build run:

```bash
bun run build
```

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.
Your app is ready to be deployed!

You can deploy the `dist` folder to any static host provider (netlify, surge, now, etc.)
