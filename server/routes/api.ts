import { Elysia, t } from "elysia";

import { prisma } from "@server/prisma.ts";
import { authMiddleware } from "@server/middleware.ts";
import { sql, Document } from "@server/sql.ts";
import { DocumentType } from "@prisma/client";
import { SagError } from "@server/errors.ts";
import { AuthContext, AuthContextWithBody, AuthContextWithQuery } from "@server/types.ts";

const COMPILER_URL = Bun.env.COMPILER_URL || "http://localhost:8081";

export const api = new Elysia({ prefix: "/api" })
  .get(
    "/municipalities",
    async ({ log, set }: AuthContext) => {
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
    async ({ log, set }: AuthContext) => {
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
    async ({ set, body: { municipalityName } }: AuthContextWithBody<{ municipalityName: string }>) => {
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
    async ({ log, set, userId }: AuthContext): Promise<Document[] | { error: string }> => {
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
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
      body: { name, projectName, organizationName, municipalityName, path, documentType, content, isTemplate },
      userId,
    }: AuthContextWithBody<{
      name: string;
      projectName: string | undefined;
      organizationName: string;
      municipalityName: string;
      path: string;
      documentType: "file" | "folder";
      content?: string | null;
      isTemplate?: boolean | undefined;
    }>): Promise<string | { error: string }> => {
      let result: string | null;
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      console.log("Creating document with content: ", content);
      try {
        result = await sql.createDocument(
          name,
          userId,
          projectName,
          organizationName,
          municipalityName,
          path,
          DocumentType[documentType.toUpperCase() as keyof typeof DocumentType],
          content,
          isTemplate,
        );
      } catch (e) {
        if (e instanceof SagError) {
          log.error(e.message);
          set.status = 400;
          return e.message;
        }

        log.error(e instanceof Error ? e.message : String(e));
        log.error("An unknown error occurred");
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
        projectName: t.Optional(t.String()),
        organizationName: t.String(),
        municipalityName: t.String(),
        path: t.String(),
        documentType: t.Union([t.Literal("file"), t.Literal("folder")]),
        content: t.Optional(t.String()),
        isTemplate: t.Optional(t.Boolean()),
      }),
      detail: { tags: ["api"], description: "Create a new document" },
    },
  )
  .put(
    "/document",
    async ({
      log,
      set,
      body: { projectName, organizationName, municipalityName, path, newName },
      userId,
    }: AuthContextWithBody<{
      projectName: string | undefined;
      organizationName: string;
      municipalityName: string;
      path: string;
      newName: string;
    }>) => {
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

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
        projectName: t.Optional(t.String()),
        organizationName: t.String(),
        municipalityName: t.String(),
        path: t.String(),
        newName: t.String(),
      }),
    },
  )
  .put(
    "/document_content",
    async ({
      log,
      set,
      body: { projectName, organizationName, municipalityName, path, content },
      userId,
    }: AuthContextWithBody<{
      projectName: string | undefined;
      organizationName: string;
      municipalityName: string;
      path: string;
      content: string;
    }>) => {
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

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
        projectName: t.Optional(t.String()),
        organizationName: t.String(),
        municipalityName: t.String(),
        path: t.String(),
        content: t.String(),
      }),
      detail: { tags: ["api"], description: "Update document's content" },
    },
  )
  .get(
    "/document_content",
    async ({
      log,
      set,
      query: { projectName, organizationName, municipalityName, path },
      userId,
    }: AuthContextWithQuery<{
      projectName: string | undefined;
      organizationName: string;
      municipalityName: string;
      path: string;
    }>) => {
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

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
        projectName: t.Optional(t.String()),
        organizationName: t.String(),
        municipalityName: t.String(),
        path: t.String(),
      }),
      detail: { tags: ["api"], description: "Get document's content" },
    },
  )
  .delete(
    "/document",
    async ({
      log,
      set,
      body: { projectName, organizationName, municipalityName, path },
      userId,
    }: AuthContextWithBody<{
      projectName: string | undefined;
      organizationName: string;
      municipalityName: string;
      path: string;
    }>) => {
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      console.log("Deleting document with projectName: ", projectName);
      try {
        const result = await sql.deleteDocument(userId, municipalityName, organizationName, projectName, path);
        if (result === null || result < 1) {
          set.status = 400;
          return "Could not delete document";
        }
        set.status = 200;
        return "Document deleted";
      } catch (error) {
        if (error instanceof SagError) {
          set.status = 400;
          return error.message;
        } else {
          set.status = 500;
          return "An error occurred";
        }
      }
    },
    {
      body: t.Object({
        projectName: t.Optional(t.String()),
        organizationName: t.String(),
        municipalityName: t.String(),
        path: t.String(),
      }),
      detail: { tags: ["api"], description: "Delete document" },
    },
  )
  .post(
    "/save-as-template",
    async ({
      log,
      set,
      body: { organizationName, name, content },
      userId,
    }: AuthContextWithBody<{ organizationName: string; name: string; content: string }>) => {
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      try {
        const result = await sql.saveAsTemplate(userId, organizationName, name, content);
        if (result === null) {
          set.status = 400;
          return "Could not save document as template";
        }
        set.status = 201;
        return result;
      } catch (e) {
        if (e instanceof SagError) {
          if (e.message.includes("already exists")) {
            set.status = 409;
            return e.message;
          }
          console.log(e.message);
          set.status = 400;
          return e.message;
        } else {
          set.status = 500;
          return "An error occurred";
        }
      }
    },
    {
      body: t.Object({
        organizationName: t.String(),
        name: t.String(),
        content: t.String(),
      }),
      detail: { tags: ["api"], description: "Save document as template" },
    },
  )
  .post(
    "/check_path",
    async ({
      log,
      set,
      body: { projectName, organizationName, municipalityName, path, possibleName, isNew },
      userId,
    }: AuthContextWithBody<{
      projectName: string | undefined;
      organizationName: string;
      municipalityName: string;
      path: string;
      possibleName: string;
      isNew: boolean;
    }>) => {
      const result = await sql.checkPathExists(
        possibleName,
        municipalityName,
        organizationName,
        projectName,
        path,
        isNew,
      );
      if (result) {
        set.status = 400;
        return "Path already exists";
      }
      set.status = 200;
      return "Path is available";
    },
    {
      body: t.Object({
        projectName: t.Optional(t.String()),
        organizationName: t.String(),
        municipalityName: t.String(),
        path: t.String(),
        possibleName: t.String(),
        isNew: t.Boolean(),
      }),
      detail: { tags: ["api"] },
    },
  );
