# Web Server Client - Database

This is the database specific README of this project, make sure you first read the [overall documentation](../README.md).

## Get started

To run the DB you should use Docker and the services defined in the [docker-compose.yaml](../docker-compose.yaml) file in the root folder.

```bash
docker compose up db db-setup
```

This exposes the database at the url defined by the `.env` variable from the root.

## Documentation

We use PostgreSQL as the RDBMS and Prisma as the ORM for it, here are the respective docs:

- [PostgreSQL](https://www.postgresql.org/)
- [Prisma](https://www.prisma.io/docs)

## Changing the schema

You can find the schema at [./schema.prisma](./schema.prisma), which holds all our models, tables and most of our constraints. To update you can simply change the schema (VSC extension is recommended for it) and once you are done you have to migrate the changes. To migrate you need to have your db running through Docker and from the root directory run:

```bash
bunx prisma migrate dev
```

This will compile your changes, if valid then ask for a name for the migration.

### Migrations

You will find them in the [./migrations](./migrations) folder. This is just a collection of records showing what changes have been made SQL-wise to the database since its inception. When you run the DB-setup these migrations are applied.

Once main use of the migration files for us is to fine tune setting that Prisma isn't capable of handling. Usually you would define here any rule Prisma has no function for, e.g. conditional partial constraints as visible can be seen [here](./migrations/20241220112305_documents_on_orgs/).

## Seeding the database

The database seeding happens through the [init_database.ts](./utils/init_database.ts) util file. Here you may add any new data you want to seed the database with.

Make sure that if you make a breaking change to the server or db to update the seeding logic accordingly.

## Viewing realtime state of the DB

As it is a postgres database, you can always use tools such as `psql` and connect to your database through that and the defined link in the `.env` file, however Prisma comes with its own solution too, Prisma Studio:

```bash
bunx prisma studio
```

This should start an interactive overview of your database where you can also change records. It should be on http://localhost:5000
