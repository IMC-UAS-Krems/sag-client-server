# Sagittarius - Web Server Client

Welcome to the web server client module of the Sagittarius project! This is one of the main parts of the project allowing end-users to interact with the system, plan and create their own dashboards via `.ssd` code and it also boasts a comprehensive Admin area that can manage almost all regards.

## Structure

This repository works as a singular Bun project comprising of these three components:

- [Backend server - ElysiaJS](./server/README.md) (./server)
- [Database - PostgreSQL - Prisma ORM managed](./prisma/README.md) (./prisma)
- [Frontend - Solid](./client/README.md) (./client)

Each of these components have their own readme, documenting and guiding how you may contribute to it. To quickly jump to them you can simply click the links above.

## Getting Started

To get started with this template, install the required dependencies (given you are not only running it through Docker):

```bash
bun install
```

Then optionally export the prisma types

```bash
bunx prisma generate
```

### ENV variables

Don't forget to put the `.env` file into the root of this repository. You can download it from the Teams or ask a colleague for it.

## Development

Generally development happens in context of all other components running, e.g. compiler, deployer, dash... This is of course needed for many of this component's features to work too, such as the code compilation, checking and deployment. Other than these features, this part of the application can also be ran and developed standalone to save on resources.

When developing with the main Docker file I recommend you compose the whole project, then stop the `client` and `server` containers and start them manually via bun here. This allows for hot realoading and a better dev experience.

### Running via Docker

This project uses Docker and it is recommended that you use it, as it is very easy. To start your server all you have to do is from the main directory run:

```bash
docker compose up --build
```

After which you will find your application endpoints at:

- Backend: http://localhost:9512/
- Frontend: http://localhost:80/

(when the whole project is composed it just calls this compose file too)

### Running components separately

First you should start the database from the root directory:

```bash
docker compose up db db-setup
```

To start the development server cd into the server directory and start via bun:

```bash
bun run serve
```

The server will be started on http://localhost:9512/

To start the web client run:

```bash
bun run dev
```

Open http://localhost:4000/ with your browser to see the result.

### Using Bun - Adding and managing Packages

As mentioned before, the project uses Bun, which is blazing fast lightweight Javascript runtime alternative to Node.js. [Here is the documentation for it.](https://bun.sh/docs)

It has full backwards compatibility with `npm` so any non bun-specific command (`npx prisma studio` for instance) could still in theory be ran through npm or vice-versa. To run the usual `npm` commands use `bun` instead, and to run `npx` commands use `bunx`.

To add, remove or install packages use the bun commands:

```bash
bun install <npm-package>
bun uninstall <npm-package-name>
bun install
```

### Formatting

Running the formatter on the project is as easy as:

```bash
bun run format
```

Running it before commiting keeps the styling clean and tidy.
