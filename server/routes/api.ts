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
    "/document",
    async ({
      log,
      set,
      body: { name, projectName, organizationName, municipalityName, path, documentType },
      userId,
    }) => {
      let result: number;

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

      if (result === null || result < 1) {
        set.status = 400;
        return "Could not create document";
      }

      set.status = 200;
      return "Document created";
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
  .post(
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
      beforeHandle: authMiddleware,
      detail: { tags: ["api"] },
    },
  );
