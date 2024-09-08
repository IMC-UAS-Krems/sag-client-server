import { Elysia, t } from "elysia";

import { prisma } from "@server/prisma";
import { authMiddleware } from "@server/middleware";
import { sql, Document } from "@server/sql";
import { DocumentType } from "@prisma/client";
import { SagError } from "@server/errors";

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
    {
      detail: {
        tags: ["api"],
        description: "Get all municipalities from the database",
      },
    },
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
    {
      detail: {
        tags: ["api"],
        description: "Get all organizations from the database",
      },
    },
  )

  .post(
    "/organizationsByMunicipality",
    async ({ set, body: { municipalityName } }) => {
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
    {
      detail: {
        tags: ["api"],
        description: "Get all organizations of a given municipality via its name",
      },
      body: t.Object({
        municipalityName: t.String(),
      }),
    },
  )

  .onBeforeHandle(async (context) => {
    return await authMiddleware(
      {
        set: context.set,
        userId: context.userId, // Pass userId here
      },
      { requireAdmin: false },
    );
  })

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
      detail: {
        tags: ["api"],
        description: "Get all documents of a user by user ID",
      },
    },
  )

  .post(
    "/document",
    async ({
      log,
      set,
      body: { name, projectName, organizationName, municipalityName, path, documentType },
      userId,
    }): Promise<string> => {
      let result: string | null;

      try {
        result = await sql.createDocument(
          name,
          userId,
          projectName,
          organizationName,
          municipalityName,
          path,
          DocumentType[documentType.toUpperCase()],
        );
      } catch (e) {
        if (e instanceof SagError) {
          log.error(e);
          set.status = 400;
          return e.message;
        }

        log.error(e);
        set.status = 500;
        return "An error occurred";
      }

      if (result === null) {
        set.status = 400;
        return "Could not create document";
      }

      set.status = 200;
      return result;
    },
    {
      body: t.Object({
        name: t.String(),
        projectName: t.String(),
        organizationName: t.String(),
        municipalityName: t.String(),
        path: t.String(),
        documentType: t.Union([t.Literal("file"), t.Literal("folder")]),
      }),
      beforeHandle: authMiddleware,
      detail: { tags: ["api"], description: "Create a new document" },
    },
  )
  .put(
    "/document",
    async ({ log, set, body: { projectName, organizationName, municipalityName, path, newName }, userId }) => {
      const result = await sql.renameDocument(userId, municipalityName, organizationName, projectName, path, newName);

      if (result === null) {
        set.status = 400;
        return "Could not rename document";
      }

      set.status = 200;
      return result;
    },
    {
      body: t.Object({
        projectName: t.String(),
        organizationName: t.String(),
        municipalityName: t.String(),
        path: t.String(),
        newName: t.String(),
      }),
      beforeHandle: authMiddleware,
    },
  )
  .put(
    "/document_content",
    async ({ log, set, body: { projectName, organizationName, municipalityName, path, content }, userId }) => {
      const result = await sql.updateContent(userId, municipalityName, organizationName, projectName, path, content);
      if (result === null || result < 1) {
        set.status = 400;
        return "Could not save document";
      }
      set.status = 200;
      return "Document saved";
    },
    {
      body: t.Object({
        projectName: t.String(),
        organizationName: t.String(),
        municipalityName: t.String(),
        path: t.String(),
        content: t.String(),
      }),
      beforeHandle: authMiddleware,
      detail: { tags: ["api"], description: "Update document's content" },
    },
  )
  .get(
    "/document_content",
    async ({ log, set, query: { projectName, organizationName, municipalityName, path }, userId }) => {
      const document = await sql.getContent(userId, municipalityName, organizationName, projectName, path);
      if (document === null || document.length < 1) {
        set.status = 400;
        return "Document not found";
      }
      set.status = 200;
      return document[0].content;
    },
    {
      query: t.Object({
        projectName: t.String(),
        organizationName: t.String(),
        municipalityName: t.String(),
        path: t.String(),
      }),
      beforeHandle: authMiddleware,
      detail: { tags: ["api"], description: "Get document's content" },
    },
  )
  .delete(
    "/document",
    async ({ log, set, body: { projectName, organizationName, municipalityName, path }, userId }) => {
      const result = await sql.deleteDocument(userId, municipalityName, organizationName, projectName, path);
      if (result === null || result < 1) {
        set.status = 400;
        return "Could not delete document";
      }
      set.status = 200;
      return "Document deleted";
    },
    {
      body: t.Object({
        projectName: t.String(),
        organizationName: t.String(),
        municipalityName: t.String(),
        path: t.String(),
      }),
      beforeHandle: authMiddleware,
      detail: { tags: ["api"], description: "Delete document" },
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
      detail: { tags: ["api"] },
    },
  );
