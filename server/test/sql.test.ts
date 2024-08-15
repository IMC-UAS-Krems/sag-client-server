import { sql } from "@server/sql";
import { describe, expect, test } from "bun:test";

// NOTE: testcontainers doesn't work, see https://github.com/oven-sh/bun/issues/4290
// TODO: write better tests with testcontainers

describe("Documents", () => {
  test("update content", async () => {
    let result = await sql.updateContent(
      "clxy0d4xo0003sw97z0cqzc0s",
      "St. Pölten",
      "FHSTP",
      "Project 1",
      "folder-1",
      "new content",
    );
    expect(result).toBe(0);

    result = await sql.updateContent(
      "clxy0d4xo0003sw97z0cqzc0s",
      "St. Pölten",
      "FHSTP",
      "Project 1",
      "folder-1.file-1",
      "new content",
    );
    expect(result).toBe(1);
  });

  test("get content", async () => {
    let result = await sql.getContent("St. Pölten", "FHSTP", "Project 1", "folder-1.file-1");
    expect(result.length).toBe(1);
    expect(result[0].content).toBe("new content");

    result = await sql.getContent("St. Pölten", "FHSTP", "Project 1", "folder-1");
    expect(result.length).toBe(0);
  });

  test("delete document", async () => {
    let result = await sql.deleteDocument("clxy0d4xo0003sw97z0cqzc0s", "St. Pölten", "FHSTP", "Project 1", "folder-1");
    expect(result).toBe(0);

    result = await sql.deleteDocument("clxy0d4xo0003sw97z0cqzc1c", "St. Pölten", "FHSTP", "Project 1", "folder-1");
    expect(result).toBe(2);
  });
});
