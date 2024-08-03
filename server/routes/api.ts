import { Elysia, t } from "elysia";
import { prisma } from "@server/prisma";
import { decrypt } from "@server/routes/auth";

const COMPILER_URL = Bun.env.COMPILER_URL || "http://localhost:8080";

export const api = new Elysia({ prefix: "/api" })
  .get(
    "/municipalities",
    async ({ set }) => {
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
    async ({ log, set, body: { code }, cookie }) => {
      const id = decrypt(cookie.access_token.value) as string;

      const user = await prisma.user.findUnique({
        where: {
          id,
        },
        select: {
          email: true,
          id: true,
        },
      });

      if (!user) {
        set.status = 401; // Unauthorized
        log.warn(`User not found: ${id}`);
        return { status: "error", error: "User not found" };
      }

      // "https://sagittarius-compose-production.up.railway.app/deploy",
      const compiled = await fetch(`${COMPILER_URL}/compile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: code,
          user_id: user.id,
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
      cookie: t.Cookie({
        access_token: t.String(),
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
    async ({ log, set, body: { code }, cookie }) => {
      const id = decrypt(cookie.access_token.value) as string;

      const user = await prisma.user.findUnique({
        where: {
          id,
        },
        select: {
          email: true,
          id: true,
        },
      });

      if (!user) {
        set.status = 401; // Unauthorized
        log.warn(`User not found: ${id}`);
        return { status: "error", error: "User not found" };
      }

      // "https://sagittarius-compose-production.up.railway.app/deploy",
      const compiled = await fetch(`${COMPILER_URL}/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: code,
          user_id: user.id,
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
      cookie: t.Cookie({
        access_token: t.String(),
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
  .post(
    "/test",
    async ({ log, set, body: { code }, cookie }) => {
      const id = decrypt(cookie.access_token.value) as string;

      const user = await prisma.user.findUnique({
        where: {
          id,
        },
        select: {
          email: true,
          id: true,
        },
      });

      if (!user) {
        set.status = 401; // Unauthorized
        log.warn(`User not found: ${id}`);
        return;
      }

      // "https://sagittarius-compose-production.up.railway.app/deploy",
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
        user_id: user.id,
      };
    },
    {
      body: t.Object({
        code: t.String(),
      }),
      cookie: t.Cookie({
        access_token: t.String(),
      }),
      detail: { tags: ["api"] },
    },
  );
