import { PrismaClient } from "@prisma/client";
import { sql } from "@server/sql";
import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";

// WARNING: testcontainers doesn't work, see https://github.com/oven-sh/bun/issues/4290
// WORKAROUND: https://github.com/oven-sh/bun/issues/7810#issuecomment-2212567079

// NOTE: User types:
// "clxy0d4xo0003sw97z0cqzc0s" - SUPERUSER_GLOBAL, Krems, Imc
// "clxy0d4xo0003sw97z0cqzc0c" - SUPERUSER_MUNICIPALITY, Krems, Sagittarius
// "clxy0d4xo0003sw97z0cqzc1c" - DEFAULT, St. Pölten, FHSTP

describe("Documents", () => {
  let dbContainer: StartedTestContainer;
  let dbSetupContainer: StartedTestContainer;
  beforeAll(async () => {
    dbContainer = await new GenericContainer("postgres:16")
      .withEnvironment({ POSTGRES_PASSWORD: "12345", POSTGRES_DB: process.env.POSTGRES_DB })
      .withHealthCheck({
        test: ["CMD-SHELL", "pg_isready -U postgres -d ${POSTGRES_DB}"],
        interval: 1000,
        retries: 5,
        startPeriod: 1000,
        timeout: 3000,
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections"))
      .start();

    const dbSetupImage = await GenericContainer.fromDockerfile("./prisma/", "utils/Dockerfile.db_setup").build();
    const DB_URL = `postgres://postgres:12345@${process.env.POSTGRES_HOST}:${dbContainer.getFirstMappedPort()}/postgres`;

    dbSetupContainer = await dbSetupImage
      .withEnvironment({
        DATABASE_URL: DB_URL,
      })
      .withExtraHosts([{ host: "localhost", ipAddress: "host-gateway" }])
      .withWaitStrategy(Wait.forOneShotStartup())
      .start();

    process.env.DATABASE_URL = DB_URL;

    mock.module("@server/prisma", () => {
      return {
        prisma: new PrismaClient(),
      };
    });
  });

  afterAll(async () => {
    await dbContainer.stop();
    await dbSetupContainer.stop();
  });

  afterEach(async () => {
    await dbSetupContainer.restart();
  });

  describe("Documents with SUPERUSER_GLOBAL", () => {
    test("update content of a folder", async () => {
      // update content of another municipality project
      const result = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0s",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-1",
        "new content",
      );
      expect(result).toBe(0);

      // update content of owned organization project
      const result2 = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0s",
        "Krems",
        "Imc",
        "Project 1",
        "folder-1",
        "new content",
      );
      expect(result2).toBe(0);

      // update content of owned municipality project
      const result3 = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0s",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1",
        "new content",
      );
      expect(result3).toBe(0);
    });

    test("update content of a file", async () => {
      // update content of another municipality project
      const result = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0s",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-1.file-1",
        "new content",
      );
      expect(result).toBe(1);

      // update content of owned organization project
      const result2 = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0s",
        "Krems",
        "Imc",
        "Project 1",
        "folder-1.file-1",
        "new content",
      );
      expect(result2).toBe(1);

      // update content of owned municipality project
      const result3 = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0s",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1.file-1",
        "new content",
      );
      expect(result3).toBe(1);
    });

    test("update content of a file that doesn't exist", async () => {
      // update content of a file that doesn't exist
      const result = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0s",
        "Krems",
        "Imc",
        "Project 1",
        "folder-1.wrong-file",
        "new content",
      );
      expect(result).toBe(0);
    });

    test("get content of a file", async () => {
      // get content of a file that exists in another municipality project
      const result = await sql.getContent(
        "clxy0d4xo0003sw97z0cqzc0s",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result[0].content).toBe("text\ntext");

      // get content of a file that exists in owned organization project
      const result2 = await sql.getContent("clxy0d4xo0003sw97z0cqzc0s", "Krems", "Imc", "Project 1", "folder-1.file-1");
      expect(result2[0].content).toBe("text\ntext");

      // get content of a file that exists in owned municipality project
      const result3 = await sql.getContent(
        "clxy0d4xo0003sw97z0cqzc0s",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result3[0].content).toBe("text\ntext");
    });

    test("get content of a folder", async () => {
      // get content of a folder that exists in another municipality project
      const result = await sql.getContent("clxy0d4xo0003sw97z0cqzc0s", "St. Pölten", "FHSTP", "Project 1", "folder-1");
      expect(result.length).toBe(0);

      // get content of a folder that exists in owned organization project
      const result2 = await sql.getContent("clxy0d4xo0003sw97z0cqzc0s", "Krems", "Imc", "Project 1", "folder-1");
      expect(result2.length).toBe(0);

      // get content of a folder that exists in owned municipality project
      const result3 = await sql.getContent(
        "clxy0d4xo0003sw97z0cqzc0s",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1",
      );
      expect(result3.length).toBe(0);
    });

    test("delete document with a wrong path", async () => {
      // delete document with a wrong path in another municipality project
      const result = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc0s",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-0",
      );
      expect(result).toBe(0);

      // delete document with a wrong path in owned organization project
      const result2 = await sql.deleteDocument("clxy0d4xo0003sw97z0cqzc0s", "Krems", "Imc", "Project 1", "folder-0");
      expect(result2).toBe(0);

      // delete document with a wrong path in owned municipality project
      const result3 = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc0s",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-0",
      );
      expect(result3).toBe(0);
    });

    test("delete document with a correct path", async () => {
      // delete document with a correct path in another municipality project
      const result = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc0s",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result).toBe(1);

      // delete document with a correct path in owned organization project
      const result2 = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc0s",
        "Krems",
        "Imc",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result2).toBe(1);

      // delete document with a correct path in owned municipality project
      const result3 = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc0s",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result3).toBe(1);
    });
  });

  describe("Documents with SUPERUSER_MUNICIPALITY", () => {
    test("update content of a folder", async () => {
      // update content of another municipality project
      const result = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0c",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-1",
        "new content",
      );
      expect(result).toBe(0);

      // update content of owned organization project
      const result2 = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0c",
        "Krems",
        "Imc",
        "Project 1",
        "folder-1",
        "new content",
      );
      expect(result2).toBe(0);

      // update content of owned municipality project
      const result3 = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0c",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1",
        "new content",
      );
      expect(result3).toBe(0);
    });

    test("update content of a file", async () => {
      // update content of another municipality project
      const result = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0c",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-1.file-1",
        "new content",
      );
      expect(result).toBe(0);

      // update content of owned organization project
      const result2 = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0c",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1.file-1",
        "new content",
      );
      expect(result2).toBe(1);

      // update content of owned municipality project
      const result3 = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0c",
        "Krems",
        "Imc",
        "Project 1",
        "folder-1.file-1",
        "new content",
      );
      expect(result3).toBe(1);
    });

    test("update content of a file that doesn't exist", async () => {
      // update content of a file that doesn't exist
      const result = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc0c",
        "Krems",
        "Imc",
        "Project 1",
        "folder-1.wrong-file",
        "new content",
      );
      expect(result).toBe(0);
    });

    test("get content of a file", async () => {
      // get content of a file that exists in another municipality project
      const result = await sql.getContent(
        "clxy0d4xo0003sw97z0cqzc0c",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result.length).toBe(0);

      // get content of a file that exists in owned organization project
      const result2 = await sql.getContent("clxy0d4xo0003sw97z0cqzc0c", "Krems", "Imc", "Project 1", "folder-1.file-1");
      expect(result2[0].content).toBe("text\ntext");

      // get content of a file that exists in owned municipality project
      const result3 = await sql.getContent(
        "clxy0d4xo0003sw97z0cqzc0c",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result3[0].content).toBe("text\ntext");
    });

    test("get content of a folder", async () => {
      // get content of a folder that exists in another municipality project
      const result = await sql.getContent("clxy0d4xo0003sw97z0cqzc0c", "St. Pölten", "FHSTP", "Project 1", "folder-1");
      expect(result.length).toBe(0);

      // get content of a folder that exists in owned organization project
      const result2 = await sql.getContent("clxy0d4xo0003sw97z0cqzc0c", "Krems", "Imc", "Project 1", "folder-1");
      expect(result2.length).toBe(0);

      // get content of a folder that exists in owned municipality project
      const result3 = await sql.getContent(
        "clxy0d4xo0003sw97z0cqzc0c",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1",
      );
      expect(result3.length).toBe(0);
    });

    test("delete document with a wrong path", async () => {
      // delete document with a wrong path in another municipality project
      const result = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc0c",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-0",
      );
      expect(result).toBe(0);

      // delete document with a wrong path in owned organization project
      const result2 = await sql.deleteDocument("clxy0d4xo0003sw97z0cqzc0c", "Krems", "Imc", "Project 1", "folder-0");
      expect(result2).toBe(0);

      // delete document with a wrong path in owned municipality project
      const result3 = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc0c",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-0",
      );
      expect(result3).toBe(0);
    });

    test("delete document with a correct path", async () => {
      // delete document with a correct path in another municipality project
      const result = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc0c",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result).toBe(0);

      // delete document with a correct path in owned organization project
      const result2 = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc0c",
        "Krems",
        "Imc",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result2).toBe(1);

      // delete document with a correct path in owned municipality project
      const result3 = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc0c",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result3).toBe(1);
    });
  });

  describe("Documents with DEFAULT USER", () => {
    test("update content of a folder", async () => {
      // update content of another municipality project
      const result = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc1c",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-1",
        "new content",
      );
      expect(result).toBe(0);

      // update content of owned organization project
      const result2 = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc1c",
        "Krems",
        "Imc",
        "Project 1",
        "folder-1",
        "new content",
      );
      expect(result2).toBe(0);

      // update content of owned municipality project
      const result3 = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc1c",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1",
        "new content",
      );
      expect(result3).toBe(0);
    });

    test("update content of a file", async () => {
      // update content of another municipality project
      const result = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc1c",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-1.file-1",
        "new content",
      );
      expect(result).toBe(1);

      // update content of owned organization project
      const result2 = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc1c",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1.file-1",
        "new content",
      );
      expect(result2).toBe(0);

      // update content of owned municipality project
      const result3 = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc1c",
        "Krems",
        "Imc",
        "Project 1",
        "folder-1.file-1",
        "new content",
      );
      expect(result3).toBe(0);
    });

    test("update content of a file that doesn't exist", async () => {
      // update content of a file that doesn't exist
      const result = await sql.updateContent(
        "clxy0d4xo0003sw97z0cqzc1c",
        "Krems",
        "Imc",
        "Project 1",
        "folder-1.wrong-file",
        "new content",
      );
      expect(result).toBe(0);
    });

    test("get content of a file", async () => {
      // get content of a file that exists in another municipality project
      const result = await sql.getContent(
        "clxy0d4xo0003sw97z0cqzc1c",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result[0].content).toBe("text\ntext");

      // get content of a file that exists in owned organization project
      const result2 = await sql.getContent("clxy0d4xo0003sw97z0cqzc1c", "Krems", "Imc", "Project 1", "folder-1.file-1");
      expect(result2.length).toBe(0);

      // get content of a file that exists in owned municipality project
      const result3 = await sql.getContent(
        "clxy0d4xo0003sw97z0cqzc1c",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result3.length).toBe(0);
    });

    test("get content of a folder", async () => {
      // get content of a folder that exists in another municipality project
      const result = await sql.getContent("clxy0d4xo0003sw97z0cqzc1c", "St. Pölten", "FHSTP", "Project 1", "folder-1");
      expect(result.length).toBe(0);

      // get content of a folder that exists in owned organization project
      const result2 = await sql.getContent("clxy0d4xo0003sw97z0cqzc1c", "Krems", "Imc", "Project 1", "folder-1");
      expect(result2.length).toBe(0);

      // get content of a folder that exists in owned municipality project
      const result3 = await sql.getContent(
        "clxy0d4xo0003sw97z0cqzc1c",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1",
      );
      expect(result3.length).toBe(0);
    });

    test("delete document with a wrong path", async () => {
      // delete document with a wrong path in another municipality project
      const result = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc1c",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-0",
      );
      expect(result).toBe(0);

      // delete document with a wrong path in owned organization project
      const result2 = await sql.deleteDocument("clxy0d4xo0003sw97z0cqzc1c", "Krems", "Imc", "Project 1", "folder-0");
      expect(result2).toBe(0);

      // delete document with a wrong path in owned municipality project
      const result3 = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc1c",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-0",
      );
      expect(result3).toBe(0);
    });

    test("delete document with a correct path", async () => {
      // delete document with a correct path in another municipality project
      const result = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc1c",
        "St. Pölten",
        "FHSTP",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result).toBe(1);

      // delete document with a correct path in owned organization project
      const result2 = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc1c",
        "Krems",
        "Imc",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result2).toBe(0);

      // delete document with a correct path in owned municipality project
      const result3 = await sql.deleteDocument(
        "clxy0d4xo0003sw97z0cqzc1c",
        "Krems",
        "Sagittarius",
        "Project 1",
        "folder-1.file-1",
      );
      expect(result3).toBe(0);
    });
  });
});
