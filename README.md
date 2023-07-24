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

Run the formatter on the client:

```bash
bun x rome format client/ --write
```

Run the formatter on the server:

```bash
bun x rome format server/ --write
```

## Development

_\[!] IMPORTANT: Run before committing, or the entire commit history will be poisoned_

To start the development server run:

```bash
bun run serve
```

A server will be started on http://localhost:3000/.

To start the web client run:

```bash
bun run dev
```

Open http://localhost:4000/ with your browser to see the result.
