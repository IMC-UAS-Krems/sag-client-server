import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@∆";
import { Organization, Project, User, Municipality, UserType, DocumentType } from "@prisma/client";

export type Document = {
  name: string;
  municipalityName: string;
  orgName: string;
  projectName: string;
  documentType: DocumentType;
  documentPath: string;
};

/** UserDocument is a `User` object with an additional `documents` field */
export type UserDocument = User & { documents: Document[] };

export async function createMunicipality(name: string): Promise<Municipality> {
  return await prisma.municipality.create({
    data: {
      name,
    },
  });
}

export async function selectMunicipality(name: string): Promise<Municipality | null> {
  return await prisma.municipality.findUnique({
    where: {
      name,
    },
  });
}

export async function createOrganization(name: string, municipalityName: string): Promise<Organization> {
  if (selectMunicipality(municipalityName) === null) {
    throw new Error(`Municipality ${municipalityName} does not exist`);
  }
  return await prisma.organization.create({
    data: {
      name: name,
      municipality: {
        connect: { name: municipalityName },
      },
    },
  });
}

export async function selectOrganization(name: string): Promise<Organization | null> {
  return await prisma.organization.findUnique({
    where: {
      name,
    },
  });
}

export async function createProject(name: string, organizationName: string): Promise<Project> {
  if ((await selectOrganization(organizationName)) === null) {
    throw new Error(`Organization ${organizationName} does not exist`);
  }

  return await prisma.project.create({
    data: {
      name: name,
      organization: {
        connect: { name: organizationName },
      },
    },
  });
}

export async function createUser(
  username: string,
  password: string,
  name: string,
  email: string,
  organizationName: string,
  municipalityName: string,
): Promise<UserDocument> {
  const user = await prisma.user.create({
    data: {
      username,
      password,
      name,
      email,
      organization: {
        connect: { name: organizationName },
      },
      municipality: {
        connect: { name: municipalityName },
      },
    },
  });
  if (user === null) {
    throw new Error(`User ${username} could not be created`);
  }

  (user as UserDocument).documents = await getDocuments(user.id);
  return user as UserDocument;
}

export async function selectUser(
  userId?: string,
  email?: string,
  username?: string,
  includeDocuments: boolean = false,
): Promise<User | UserDocument | null> {
  if (userId === undefined && email === undefined && username === undefined) {
    throw new Error("At least one of userId, email, or username must be provided");
  }
  let user: User | null = null;
  if (userId != undefined) {
    user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  } else if (email != undefined) {
    user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
  } else {
    user = await prisma.user.findUnique({
      where: {
        username,
      },
    });
  }
  if (user === null) {
    return null;
  }
  if (includeDocuments) {
    (user as UserDocument).documents = await getDocuments(user.id);
  }
  return user;
}

export async function createDocument(
  name: string,
  authorId: string,
  projectName: string,
  organizationName: string,
  municipalityName: string,
  path: string,
  documentType: DocumentType,
) {
  path =
    path.length == 0 ? name.toLowerCase().replaceAll(" ", "-") : `${path}.${name.toLowerCase().replaceAll(" ", "-")}`;
  const docType = documentType === "FOLDER" ? "FOLDER" : "FILE";
  return await prisma.$executeRaw`
        INSERT INTO documents (id, name, content, "authorId", "projectId", path, "documentType")
        VALUES (${createId()}, ${name}, '', ${authorId},
          (SELECT id FROM projects WHERE projects.name = ${projectName}
          AND projects."organizationId" =
            (SELECT organisations.id FROM organisations
              INNER JOIN users ON users."organizationId" = organisations.id
              INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
              WHERE organisations.name = ${organizationName} AND municipalities.name = ${municipalityName})),
          text2ltree(${path}), ${docType}::"DocumentType")
        `;
}

/**
 * Get documents for a user
 * when the `user.UserType` is `DEFAULT`, select documents from the user's organization
 * when the `user.UserType` is `SUPERUSER_MUNICIPALITY`, select documents from the user municipality
 * when the `user.UserType` is `SUPERUSER_GLOBAL`, select documents from all municipalities
 */
export async function getDocuments(userId: string): Promise<Document[]> {
  const user = await selectUser(userId);
  if (user === null) {
    throw new Error(`User ${userId} does not exist`);
  }

  switch (user.userType) {
    case UserType.DEFAULT: {
      return await prisma.$queryRaw<Document[]>`
            SELECT documents.name,  municipalities.name as "municipalityName", organisations.name as "orgName", projects.name as "projectName",
              documents."documentType", documents.path::text as "documentPath"
            FROM users
            INNER JOIN organisations ON organisations.id = users."organizationId"
            INNER JOIN projects ON organisations.id = "projects"."organizationId"
            INNER JOIN documents ON "documents"."projectId" = projects.id
            INNER JOIN municipalities ON municipalities.id = users."municipalityId"
            WHERE "users"."id" = ${userId}
            ORDER BY "municipalityName", "orgName", "projectName", CASE WHEN documents."documentType" = 'FOLDER'::"DocumentType" then 0 else 1 end,
            "documentPath";`;
    }
    case UserType.SUPERUSER_MUNICIPALITY: {
      return await prisma.$queryRaw<Document[]>`
            SELECT documents.name, municipalities.name as "municipalityName", organisations.name as "orgName", projects.name as "projectName", documents."documentType",
              documents.path::text as "documentPath"
            FROM users
            INNER JOIN organisations ON organisations."municipalityId" = users."municipalityId"
            INNER JOIN projects ON organisations.id = projects."organizationId"
            INNER JOIN documents ON documents."projectId" = projects.id
            INNER JOIN municipalities ON municipalities.id = users."municipalityId"
            WHERE "users"."id" = ${userId}
            ORDER BY "municipalityName", "orgName", "projectName", CASE WHEN documents."documentType" = 'FOLDER'::"DocumentType" then 0 else 1 end,
            "documentPath";`;
    }
    case UserType.SUPERUSER_GLOBAL: {
      return await prisma.$queryRaw<Document[]>`
            SELECT documents.name, municipalities.name as "municipalityName", organisations.name AS "orgName", projects.name AS "projectName", documents."documentType",
              documents.path::text AS "documentPath"
            FROM users
            CROSS JOIN organisations
            INNER JOIN projects ON organisations.id = projects."organizationId"
            INNER JOIN documents ON documents."projectId" = projects.id
            INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
            WHERE users.id = ${userId}
            ORDER BY "municipalityName", "orgName", "projectName", CASE WHEN documents."documentType" = 'FOLDER'::"DocumentType" then 0 else 1 end,
            "documentPath";`;
    }
  }
}

export async function getContent(
  municipalityName: string,
  orgName: string,
  projectName: string,
  documentPath: string,
): Promise<string> {
  return await prisma.$queryRaw<string>`
        SELECT documents.content
        FROM documents
        INNER JOIN projects ON projects.id = documents."projectId"
        INNER JOIN organisations ON organisations.id = projects."organizationId"
        INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
        WHERE municipalities.name = ${municipalityName} AND organisations.name = ${orgName} AND projects.name = ${projectName}
        AND documents.path = text2ltree(${documentPath}) AND documents."documentType" = 'FILE'::"DocumentType"
        `;
}

export async function updateContent(
  authorId: string,
  municipalityName: string,
  orgName: string,
  projectName: string,
  documentPath: string,
  content: string,
) {
  return await prisma.$executeRaw`
        UPDATE documents
        SET content = ${content}, "authorId" = ${authorId}
        FROM projects
        INNER JOIN organisations ON organisations.id = projects."organizationId"
        INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
        WHERE municipalities.name = ${municipalityName} AND organisations.name = ${orgName} AND projects.name = ${projectName}
        AND documents.path = text2ltree(${documentPath}) AND documents."projectId" = projects.id
        AND documents."documentType" = 'FILE'::"DocumentType"
        `;
}

export async function deleteDocument(
  userId: string,
  municipalityName: string,
  orgName: string,
  projectName: string,
  documentPath: string,
) {
  return await prisma.$executeRaw`
        DELETE  FROM documents
        USING projects
        INNER JOIN users ON users."organizationId" = projects."organizationId"
        INNER JOIN organisations ON organisations.id = projects."organizationId"
        INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
        WHERE municipalities.name = ${municipalityName} AND organisations.name = ${orgName} AND projects.name = ${projectName}
        AND documents.path <@ text2ltree(${documentPath}) AND documents."projectId" = projects.id
        AND users.id = ${userId}
        `;
}

export * as sql from "./sql";
