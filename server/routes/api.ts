import { Elysia, t } from "elysia";
import { prisma } from "@server/prisma";
import { authMiddleware } from "@server/middleware";
import { sql, Document } from "@server/sql";

const COMPILER_URL = Bun.env.COMPILER_URL || "http://localhost:8080";

export const api = new Elysia({ prefix: "/api" })
  .get(
    "/municipalities",
    async ({ log, set }) => {
      const municipalities = await prisma.municipality.findMany({
        select: {
          name: true,
        },
      });
      set.status = 200;
      return municipalities.map((m) => m.name);
    },
    { detail: { tags: ["api"] } },
  )

  .get(
    "/organizations",
    async ({ log, set }) => {
      const organizations = await prisma.organization.findMany({
        select: {
          name: true,
        },
      });
      set.status = 200;
      return organizations.map((o) => o.name);
    },
    { detail: { tags: ["api"] } },
  )

  .post(
    "/organizationsByMunicipality",
    async ({ body: { municipalityName }, set }) => {
      try {
        const organizations = await prisma.organization.findMany({
          where: {
            municipality: {
              name: municipalityName,
            },
          },
        });
        set.status = 200;
        return organizations.map((o) => o.name);
      } catch (error) {
        set.status = 500;
        return { error: "Failed to fetch organizations" };
      }
    },
    { detail: { tags: ["api"] } },
  )
  .post(
    "/compile",
    async ({ log, set, body: { code }, userId }) => {
      const compiled = await fetch(`${COMPILER_URL}/compile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: code,
          user_id: userId,
        }),
      });

      const data = await compiled.json();

      if (!compiled.ok || data.status == "error") {
        log.error(`${data.error}`);
        return data;
      }

      set.status = 200;
      log.info(`Data ${data} compiled.`);
      return data;
    },
    {
      body: t.Object({
        code: t.String(),
      }),
      beforeHandle: authMiddleware,
      response: t.Union([
        t.Object({ status: t.Literal("ok"), url: t.String() }),
        t.Object({ status: t.Literal("error"), errors: t.Array(t.Any()) }),
        t.Object({ status: t.Literal("error"), error: t.String() }),
      ]),
      detail: { tags: ["api"] },
    },
  )
  .post(
    "/check",
    async ({ log, set, userId, body: { code } }) => {
      const compiled = await fetch(`${COMPILER_URL}/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: code,
          user_id: userId,
        }),
      });

      const data = await compiled.json();

      if (!compiled.ok || data.status == "error") {
        log.error(`${data.error}`);
        return data;
      }

      set.status = 200;
      log.info(`Data ${data} compiled.`);
      return data;
    },
    {
      body: t.Object({
        code: t.String(),
      }),
      beforeHandle: authMiddleware,
      response: t.Union([
        t.Object({ status: t.Literal("ok") }),
        t.Object({
          status: t.Literal("error"),
          errors: t.Array(t.Any()),
        }),
      ]),
      detail: { tags: ["api"] },
    },
  )
  .get(
    "/documents",
    async ({ log, set, userId }): Promise<Document[]> => {
      const documents = sql.getDocuments(userId);
      set.status = 200;
      return documents;
    },
    {
      beforeHandle: authMiddleware,
      detail: { tags: ["api"] },
    },
  )
  .post(
    "/test",
    async ({ log, set, body: { code }, userId }) => {
      const compiled = await fetch(`${COMPILER_URL}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: code,
        }),
      });
      const data = await compiled.json();

      if (!compiled.ok) {
        set.status = compiled.status;
        log.error(`${data.error}`);
        set.status = 400;
        return data.error;
      }

      set.status = 200;
      log.info(`Data ${data} compiled.`);
      return {
        compiled: data,
        user_id: userId,
      };
    },
    {
      body: t.Object({
        code: t.String(),
      }),
      beforeHandle: authMiddleware,
      detail: { tags: ["api"] },
    },
  );
