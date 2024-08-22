import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@∆";
import { Organization, Project, User, Municipality, UserType, DocumentType, Prisma } from "@prisma/client";
import { SagError } from "./errors";

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

/**
 * throws an error if the organization does not exist
 */
export async function createOrganization(name: string, municipalityName: string): Promise<Organization> {
  if (selectMunicipality(municipalityName) === null) {
    throw new SagError(`Municipality ${municipalityName} does not exist`);
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

/**
 * throws an error if the organization does not exist
 */
export async function createProject(name: string, organizationName: string): Promise<Project> {
  if ((await selectOrganization(organizationName)) === null) {
    throw new SagError(`Organization ${organizationName} does not exist`);
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

/**
 * throws an error if user can't be created
 */
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
    throw new SagError(`User ${username} could not be created`);
  }

  (user as UserDocument).documents = await getDocuments(user.id);
  return user as UserDocument;
}

/**
 * throws an error when all optional arguments are null
 */
export async function selectUser(
  userId?: string,
  email?: string,
  username?: string,
  includeDocuments: boolean = false,
): Promise<User | UserDocument | null> {
  if (userId === undefined && email === undefined && username === undefined) {
    throw new SagError("At least one of userId, email, or username must be provided");
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

export async function getDocumentFolderPath(
  path: string,
  projectName: string,
  organizationName: string,
  municipalityName: string,
): Promise<{ path: string }[]> {
  return await prisma.$queryRaw<{ path: string }[]>`
    SELECT ltree2text(path) as path FROM documents
    INNER JOIN projects ON projects.id = documents."projectId"
    INNER JOIN organisations ON organisations.id = projects."organizationId"
    INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
    WHERE projects.name = ${projectName} AND organisations.name = ${organizationName} AND municipalities.name = ${municipalityName}
    AND documents.path = text2ltree(${path}) AND documents."documentType" = 'FOLDER'::"DocumentType"
    `;
}

/**
 * throws an error if path is wrong
 * throws an error if user does not have permissions to create document
 */
export async function createDocument(
  name: string,
  authorId: string,
  projectName: string,
  organizationName: string,
  municipalityName: string,
  path: string,
  documentType: DocumentType,
): Promise<number> {
  if (
    path.length > 0 &&
    (await getDocumentFolderPath(path, projectName, organizationName, municipalityName)).length < 1
  ) {
    throw new SagError(
      `${path} does not exist in ${municipalityName}.${organizationName}.${projectName} or it's not a folder`,
    );
  }

  path =
    path.length == 0 ? name.toLowerCase().replaceAll(" ", "-") : `${path}.${name.toLowerCase().replaceAll(" ", "-")}`;

  // @ts-ignore
  const user: User | UserDocument = await selectUser(authorId);

  try {
    switch (user.userType) {
      case UserType.DEFAULT: {
        return await prisma.$executeRaw`
            INSERT INTO documents (id, name, content, "authorId", "projectId", path, "documentType")
            VALUES (${createId()}, ${name}, '', ${authorId},
              (SELECT id FROM projects WHERE projects.name = ${projectName}
              AND projects."organizationId" =
                (SELECT organisations.id FROM organisations
                  INNER JOIN users ON users."organizationId" = organisations.id
                  INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
                  WHERE organisations.name = ${organizationName} AND organisations.id = (SELECT "organizationId" FROM users WHERE id = ${authorId})
                  AND municipalities.name = ${municipalityName} AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${authorId}))),
              text2ltree(${path}), ${documentType}::"DocumentType")
            `;
      }
      case UserType.SUPERUSER_MUNICIPALITY: {
        return await prisma.$executeRaw`
            INSERT INTO documents (id, name, content, "authorId", "projectId", path, "documentType")
            VALUES (${createId()}, ${name}, '', ${authorId},
              (SELECT id FROM projects WHERE projects.name = ${projectName}
              AND projects."organizationId" =
                (SELECT organisations.id FROM organisations
                  INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
                  WHERE organisations.name = ${organizationName}
                  AND municipalities.name = ${municipalityName} AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${authorId}))),
              text2ltree(${path}), ${documentType}::"DocumentType")
            `;
      }
      case UserType.SUPERUSER_GLOBAL: {
        return await prisma.$executeRaw`
            INSERT INTO documents (id, name, content, "authorId", "projectId", path, "documentType")
            VALUES (${createId()}, ${name}, '', ${authorId},
              (SELECT id FROM projects WHERE projects.name = ${projectName}
              AND projects."organizationId" =
                (SELECT organisations.id FROM organisations
                  INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
                  WHERE organisations.name = ${organizationName} AND municipalities.name = ${municipalityName})),
              text2ltree(${path}), ${documentType}::"DocumentType")
            `;
      }
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code == "P2010") {
        throw new SagError("Can't create document, invalid permissions");
      }
    }
    throw e;
  }

  //const docType = documentType === "FOLDER" ? "FOLDER" : "FILE";
}

/**
 * Get documents for a user
 * when the `user.UserType` is `DEFAULT`, select documents from the user's organization
 * when the `user.UserType` is `SUPERUSER_MUNICIPALITY`, select documents from the user municipality
 * when the `user.UserType` is `SUPERUSER_GLOBAL`, select documents from all municipalities
 */
export async function getDocuments(userId: string): Promise<Document[]> {
  // @ts-ignore
  const user: User | UserDocument = await selectUser(userId);

  switch (user.userType) {
    case UserType.DEFAULT: {
      return await prisma.$queryRaw<Document[]>`
            SELECT documents.name,  municipalities.name as "municipalityName", organisations.name as "orgName", projects.name as "projectName",
              lower(documents."documentType"::text) as "documentType", documents.path::text AS "documentPath"
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
            SELECT documents.name, municipalities.name as "municipalityName", organisations.name as "orgName", projects.name as "projectName",
              lower(documents."documentType"::text) as "documentType", documents.path::text AS "documentPath"
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
            SELECT documents.name, municipalities.name as "municipalityName", organisations.name AS "orgName", projects.name AS "projectName",
              lower(documents."documentType"::text) as "documentType", documents.path::text AS "documentPath"
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
  userId: string,
  municipalityName: string,
  orgName: string,
  projectName: string,
  documentPath: string,
): Promise<{ content: string }[]> {
  // @ts-ignore
  const user: User | UserDocument = await selectUser(userId);

  switch (user.userType) {
    case UserType.DEFAULT: {
      return await prisma.$queryRaw<{ content: string }[]>`
            SELECT documents.content
            FROM documents
            INNER JOIN projects ON projects.id = documents."projectId"
            INNER JOIN organisations ON organisations.id = projects."organizationId"
            INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
            WHERE municipalities.name = ${municipalityName} AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} AND organisations.id = (SELECT "organizationId" FROM users WHERE id = ${userId})
            AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) AND documents."documentType" = 'FILE'::"DocumentType"
            LIMIT 1
            `;
    }
    case UserType.SUPERUSER_MUNICIPALITY: {
      return await prisma.$queryRaw<{ content: string }[]>`
            SELECT documents.content
            FROM documents
            INNER JOIN projects ON projects.id = documents."projectId"
            INNER JOIN organisations ON organisations.id = projects."organizationId"
            INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
            WHERE municipalities.name = ${municipalityName} AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) AND documents."documentType" = 'FILE'::"DocumentType"
            LIMIT 1
            `;
    }
    case UserType.SUPERUSER_GLOBAL: {
      return await prisma.$queryRaw<{ content: string }[]>`
            SELECT documents.content
            FROM documents
            INNER JOIN projects ON projects.id = documents."projectId"
            INNER JOIN organisations ON organisations.id = projects."organizationId"
            INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
            WHERE municipalities.name = ${municipalityName} AND organisations.name = ${orgName} AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) AND documents."documentType" = 'FILE'::"DocumentType"
            LIMIT 1
            `;
    }
  }
}

export async function updateContent(
  authorId: string,
  municipalityName: string,
  orgName: string,
  projectName: string,
  documentPath: string,
  content: string,
) {
  // @ts-ignore
  const user: User | UserDocument = await selectUser(authorId);

  switch (user.userType) {
    case UserType.DEFAULT: {
      return await prisma.$executeRaw`
            UPDATE documents
            SET content = ${content}, "authorId" = ${authorId}
            FROM projects
            INNER JOIN organisations ON organisations.id = projects."organizationId"
            INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
            WHERE municipalities.name = ${municipalityName} AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${authorId})
            AND organisations.name = ${orgName} AND organisations.id = (SELECT "organizationId" FROM users WHERE id = ${authorId})
            AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) AND documents."projectId" = projects.id
            AND documents."documentType" = 'FILE'::"DocumentType"
            `;
    }
    case UserType.SUPERUSER_MUNICIPALITY: {
      return await prisma.$executeRaw`
            UPDATE documents
            SET content = ${content}, "authorId" = ${authorId}
            FROM projects
            INNER JOIN organisations ON organisations.id = projects."organizationId"
            INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
            WHERE municipalities.name = ${municipalityName} AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${authorId})
            AND organisations.name = ${orgName} AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) AND documents."projectId" = projects.id
            AND documents."documentType" = 'FILE'::"DocumentType"
            `;
    }
    case UserType.SUPERUSER_GLOBAL: {
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
  }
}

export async function deleteDocument(
  userId: string,
  municipalityName: string,
  orgName: string,
  projectName: string,
  documentPath: string,
) {
  // @ts-ignore
  const user: User | UserDocument = await selectUser(userId);

  switch (user.userType) {
    case UserType.DEFAULT: {
      return await prisma.$executeRaw`
            DELETE FROM documents
            USING projects
            INNER JOIN organisations ON organisations.id = projects."organizationId"
            INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
            WHERE municipalities.name = ${municipalityName} AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} AND organisations.id = (SELECT "organizationId" FROM users WHERE id = ${userId})
            AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) AND documents."projectId" = projects.id
            `;
    }
    case UserType.SUPERUSER_MUNICIPALITY: {
      return await prisma.$executeRaw`
            DELETE FROM documents
            USING projects
            INNER JOIN organisations ON organisations.id = projects."organizationId"
            INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
            WHERE municipalities.name = ${municipalityName} AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) AND documents."projectId" = projects.id
            `;
    }
    case UserType.SUPERUSER_GLOBAL: {
      return await prisma.$executeRaw`
            DELETE  FROM documents
            USING projects
            INNER JOIN organisations ON organisations.id = projects."organizationId"
            INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
            WHERE municipalities.name = ${municipalityName} AND organisations.name = ${orgName} AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) AND documents."projectId" = projects.id
            `;
    }
  }
}

export * as sql from "./sql";
