# Sagittarius Template

## Getting Started

To get started with this template, install the required dependencies:

```bash
bun install
```

Then, export the prisma types

```bash
bun x prisma generate
```

# Formatting

Run the formatter on the project:

```bash
bun run format
```

## Development

> [!NOTE]
> Preferably run eveything inside docker

To start the development server run:

```bash
bun run serve
```

A server will be started on http://localhost:3000/

To start the web client run:

```bash
bun run dev
```
Open http://localhost:4000/ with your browser to see the result.


To start eveything inside Docker
```bash
bun run docker
```
The client will be started on http://localhost, and the server will be avaiable on http://localhost:9512 (by default)
