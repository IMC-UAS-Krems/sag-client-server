import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@∆";
import { UserRole } from "@utils/roles";
import { UserDetails, OrganisationDetails, UpdateOrganisationBody } from "@server/types";
import { Organization, Project, User, Municipality, UserType, DocumentType } from "@prisma/client";
import { SagError } from "./errors";
import path from "path";

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

/*****************************************************/
/**                Municipalities                    */
/*****************************************************/
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

export async function selectMunicipalityById(id: string): Promise<Municipality | null> {
  return await prisma.municipality.findUnique({
    where: {
      id,
    },
  });
}

/*****************************************************/
/**                Organisations                     */
/*****************************************************/

export async function createOrganization(
  name: string,
  description: string,
  municipalityName: string,
  verified?: boolean,
): Promise<Organization> {
  if ((await selectMunicipality(municipalityName)) === null) {
    throw new SagError(`Municipality ${municipalityName} does not exist`);
  }
  // Create org
  const organization = await prisma.organization.create({
    data: {
      name: name,
      description: description,
      municipality: {
        connect: { name: municipalityName },
      },
      verified: verified ?? false,
    },
  });

  // Add templates folder - NOTE: We can not use prisma.document.create() here because it does not support ltree type
  // TODO: The owner / author of this folder is the default user. Is this correct?
  await prisma.$executeRaw`
    INSERT INTO documents (id, name, content, "authorId", "organizationId", path, "documentType", "isTemplate")
    VALUES (
      ${createId()},
      'Templates',
      'This is the template folder for the organization: ${organization.name}',
      (SELECT id FROM users WHERE users.name = 'default'),
      (SELECT id FROM organisations WHERE organisations.name = ${organization.name}),
      text2ltree('templates'),
      'FOLDER'::"DocumentType",
      true
    );
  `;

  // Add example templates to the templates folder
  const exampleTemplates = [
    {
      templateTitle: "Example template 1",
      templateContent:
        "Welcome to the templates feature!\n\nHere you can see all of your organization's templates and edit, delete them as needed.\n\nTo create a new template you can simply save file as template when creating it regularly.\n\nYou can also create new files from templates when creating a new file, to do this you have select one of your organisation's templates like this one.",
    },
    {
      templateTitle: "Example template 2",
      templateContent:
        "service:\n    title is Dash dashboard\n    version is 1.0.0\n    scope is Environment\n\ndata:\n    sources -> first\n\nfirst:\n    type is SmartMeter\n    provider is Fiware\n    uri is http://localhost:1026/v2/entities\n    query is AirQualityObserved\n    config:\n        measurements:\n            450 is temperature\n            330 is humidity\n        token is 1234567890\n        company is 23\n\napplication:\n    type is Web\n    dashboard is Dash\n    layout is SinglePage\n    roles -> User, SuperUser, Admin\n    panels -> Map, Pie, XY, TS, Bar\n\nMap:\n    label is map\n    type is geomap\n    source is first\n    area is Madrid\n    data -> location, stationName, O3, NO2, SO2, address\n\nPie:\n    label is pie\n    type is pie_chart\n    source is first\n    traces -> NOx, O3, NO2, SO2, id\n    pie_chart_type is pie\n\nXY:\n    label is xy\n    type is xy_chart\n    source is first\n    traces -> dateObserved, NOx, O3, NO2, SO2, id\n\nTS:\n    label is ts\n    type is timeseries\n    source is first\n    traces -> dateObserved, NOx, O3, NO2, SO2, id\n\nBar:\n    label is bar\n    type is bar_chart\n    source is first\n    traces -> dateObserved, NOx, O3, NO2, SO2, id\n\ndeployment:\n    environments -> <local | azure>\n\n<local:>\n    <uri is https://localhost.org:3000/test>\n    <port is 50055>\n    <type is Docker>",
    },
  ];

  // TODO: The owner / author of these files is the default user. Is this correct?
  for (const template of exampleTemplates) {
    await prisma.$executeRaw`
        INSERT INTO documents (id, name, content, "authorId", "organizationId", path, "documentType", "isTemplate")
        VALUES (
          ${createId()},
          ${template.templateTitle},
          ${template.templateContent},
          (SELECT id FROM users WHERE users.name = 'default'),
          (SELECT id FROM organisations WHERE organisations.name = ${organization.name}),
          text2ltree(${joinPath("templates", template.templateTitle)}),
          'FILE'::"DocumentType",
          true
        );
      `;
  }

  return organization;
}

export async function selectOrganization(name: string): Promise<Organization | null> {
  return await prisma.organization.findUnique({
    where: {
      name,
    },
  });
}

export async function getOrganisationById(organisationId: string): Promise<OrganisationDetails | null> {
  return await prisma.organization.findUnique({
    where: {
      id: organisationId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      verified: true,
      createdAt: true,
      updatedAt: true,
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          userRole: true,
          municipality: {
            select: {
              name: true,
            },
          },
        },
      },
      municipality: {
        select: {
          name: true,
          id: true,
        },
      },
      municipalityId: true,
    },
  });
}

export async function getAllOrganisations(): Promise<OrganisationDetails[]> {
  return await prisma.organization.findMany({
    include: {
      users: {
        select: {
          name: true,
        },
      },
      municipality: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function deleteOrganisation(
  organisationId: string,
): Promise<{ success: boolean; users?: object[]; error?: string }> {
  const organisation = await prisma.organization.findUnique({
    where: {
      id: organisationId,
    },
    include: {
      users: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!organisation) {
    return { success: false, error: `Organisation with ID ${organisationId} does not exist.` };
  }

  if (organisation.users.length > 0) {
    const users = organisation.users;
    return { success: false, users: users, error: "Organisation has assigned users." };
  }

  await prisma.organization.delete({
    where: {
      id: organisationId,
    },
  });
  return { success: true };
}

export async function updateOrganisation(
  organisationId: string,
  {
    name,
    description,
    municipalityName,
    verified,
    updatedAt,
  }: {
    name?: string;
    description?: string;
    municipalityName?: string;
    verified?: boolean;
    updatedAt?: Date;
  },
): Promise<OrganisationDetails> {
  // Check if the organization exists
  const existingOrganisation = await prisma.organization.findUnique({
    where: { id: organisationId },
  });

  if (!existingOrganisation) {
    throw new Error(`Organisation ${organisationId} does not exist`);
  }

  const updateData: UpdateOrganisationBody = {
    id: organisationId,
    updatedAt: updatedAt ?? new Date(),
  };

  if (name && name !== existingOrganisation.name) {
    const organisationWithName = await prisma.organization.findFirst({
      where: {
        name: name,
      },
    });
    if (organisationWithName) {
      throw new Error(`Organisation with name "${name}" already exists`);
    }
    updateData.name = name;
  }

  if (description) updateData.description = description;

  if (municipalityName) {
    const municipality = await selectMunicipality(municipalityName);
    if (!municipality) {
      throw new Error(`Municipality ${municipalityName} does not exist`);
    }
    updateData.municipalityId = municipality.id;
  }

  if (verified !== undefined) updateData.verified = verified;
  updateData.updatedAt = updatedAt || new Date();

  const updatedOrganisation = await prisma.organization.update({
    where: { id: organisationId },
    data: updateData,
    select: {
      id: true,
      name: true,
      description: true,
      municipality: { select: { name: true } },
      municipalityId: true,
      users: { select: { name: true } },
      verified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedOrganisation;
}

/*****************************************************/
/**                   Projects                       */
/*****************************************************/

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

/*****************************************************/
/**                        User                      */
/*****************************************************/

export async function createUser(data: {
  username: string;
  password: string;
  name: string;
  email: string;
  organizationName: string;
  municipalityName: string;
  userRole: "Administrator" | "Developer" | "Manager";
  verified?: boolean;
}) {
  const userWithEmail = await prisma.user.findFirst({
    where: {
      email: data.email,
      deleted: false,
    },
  });
  if (userWithEmail) {
    throw new Error(`User with email "${data.email}" already exists`);
  }

  const userWithUsername = await prisma.user.findFirst({
    where: {
      username: data.username,
      deleted: false,
    },
  });
  if (userWithUsername) {
    throw new Error(`User with username "${data.username}" already exists`);
  }

  console.warn("Creating user with data:", data);

  try {
    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: data.password,
        name: data.name,
        email: data.email,
        userRole: data.userRole,
        organization: {
          connect: { name: data.organizationName },
        },
        municipality: {
          connect: { name: data.municipalityName },
        },
        verified: data.verified || false,
      },
    });

    console.log(`User ${user.username} created successfully`);
    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error(`User ${data.username} could not be created`);
  }
}

export async function verifyUserEmail(email: string) {
  const user = await prisma.user.findFirst({
    where: {
      email: email,
      deleted: false,
    },
    select: {
      id: true,
      verified: true,
    },
  });

  if (user === null) {
    throw new Error(`User with email "${email}" does not exist`);
  } else if (user.verified) {
    throw new Error(`User with email "${email}" is already verified`);
  } else {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        verified: true,
      },
    });
  }
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
      include: {
        municipality: {
          select: { name: true },
        },
        organization: {
          select: { name: true },
        },
      },
      where: {
        id: userId,
      },
    });
  } else if (email != undefined) {
    user = await prisma.user.findFirst({
      include: {
        municipality: {
          select: { name: true },
        },
        organization: {
          select: { name: true },
        },
      },
      where: {
        email,
        deleted: false,
      },
    });
  } else {
    user = await prisma.user.findFirst({
      include: {
        municipality: {
          select: { name: true },
        },
        organization: {
          select: { name: true },
        },
      },
      where: {
        username,
        deleted: false,
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

export async function getUserDataById(userId: string): Promise<UserDetails | null> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      municipality: {
        select: {
          name: true,
        },
      },
      organization: {
        select: {
          name: true,
        },
      },
      userRole: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    userRole: user.userRole,
    municipalityName: user.municipality?.name,
    organizationName: user.organization?.name,
  };
}

export async function getAllUsers(): Promise<UserDetails[]> {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      userRole: true,
      deleted: true,
      needsToBeLoggedOut: true,
      lastTimeActive: true,
      organization: {
        select: {
          name: true,
        },
      },
      municipality: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function updateUser(
  userId: string,
  {
    username,
    password,
    name,
    email,
    organization,
    municipality,
    userRole,
    lastTimeActive,
    needsToBeLoggedOut,
  }: {
    username?: string;
    password?: string;
    name?: string;
    email?: string;
    organization?: string;
    municipality?: string;
    userRole?: UserRole;
    lastTimeActive?: Date;
    needsToBeLoggedOut?: boolean;
  },
): Promise<UserDocument> {
  if (email) {
    const userWithEmail = await prisma.user.findFirst({
      where: {
        email: email,
        deleted: false,
      },
    });
    if (userWithEmail) {
      throw new Error(`User with email "${email}" already exists`);
    }
  }

  if (username) {
    const userWithUsername = await prisma.user.findFirst({
      where: {
        username: username,
        deleted: false,
      },
    });
    if (userWithUsername) {
      throw new Error(`User with username "${username}" already exists`);
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      username,
      password,
      name,
      email,
      organization: organization ? { connect: { name: organization } } : undefined,
      municipality: municipality ? { connect: { name: municipality } } : undefined,
      userRole,
      lastTimeActive,
      needsToBeLoggedOut,
    },
  });
  if (user === null) {
    throw new Error(`User ${userId} does not exist`);
  }
  (user as UserDocument).documents = await getDocuments(user.id);
  return user as UserDocument;
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      deleted: true,
    },
  });

  if (!user) {
    const error = new Error(`User with ID ${userId} does not exist.`);
    error.name = "UserNotFoundError";
    throw error;
  }

  if (user.deleted) {
    const error = new Error(`User with ID ${userId} is already deleted.`);
    error.name = "UserAlreadyDeletedError";
    throw error;
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      deleted: true,
      needsToBeLoggedOut: true,
    },
  });
}

/*****************************************************/
/**                    Documents                     */
/*****************************************************/

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

function joinPath(path: string, name: string): string {
  path =
    path.length == 0 ? name.toLowerCase().replaceAll(" ", "-") : `${path}.${name.toLowerCase().replaceAll(" ", "-")}`;
  return path;
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
  content?: string | null,
): Promise<string | null> {
  if (
    path.length > 0 &&
    (await getDocumentFolderPath(path, projectName, organizationName, municipalityName)).length < 1
  ) {
    throw new SagError(
      `${path} does not exist in ${municipalityName}.${organizationName}.${projectName} or it's not a folder`,
    );
  }

  path = joinPath(path, name);

  // @ts-ignore
  const user: User | UserDocument = await selectUser(authorId);
  let result = 0;
  content = content ?? "";
  console.log("Creating document with content:", content);

  try {
    switch (user.userType) {
      case UserType.DEFAULT: {
        result = await prisma.$executeRaw`
            INSERT INTO documents (id, name, content, "authorId", "projectId", path, "documentType")
            VALUES (${createId()}, ${name}, ${content}, ${authorId},
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
        result = await prisma.$executeRaw`
            INSERT INTO documents (id, name, content, "authorId", "projectId", path, "documentType")
            VALUES (${createId()}, ${name}, ${content}, ${authorId},
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
        result = await prisma.$executeRaw`
            INSERT INTO documents (id, name, content, "authorId", "projectId", path, "documentType")
            VALUES (${createId()}, ${name}, ${content}, ${authorId},
              (SELECT id FROM projects WHERE projects.name = ${projectName}
              AND projects."organizationId" =
                (SELECT organisations.id FROM organisations
                  INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
                  WHERE organisations.name = ${organizationName} AND municipalities.name = ${municipalityName})),
              text2ltree(${path}), ${documentType}::"DocumentType")
            `;
      }
    }
    if (result === 1) {
      return path;
    }
    return null;
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
        SELECT * FROM (
          -- Subquery 1: Documents linked to Projects
          SELECT 
            documents.name,  
            municipalities.name AS "municipalityName", 
            organisations.name AS "orgName", 
            projects.name AS "projectName",
            lower(documents."documentType"::text) AS "documentType", 
            documents.path::text AS "documentPath",
            documents."isTemplate" AS "isTemplate"
          FROM users
          INNER JOIN organisations ON organisations.id = users."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          LEFT JOIN projects ON organisations.id = projects."organizationId"
          INNER JOIN documents ON documents."projectId" = projects.id
          WHERE users.id = ${userId}
          
          UNION ALL
          
          -- Subquery 2: Documents linked directly to Organizations
          SELECT 
            documents.name, 
            municipalities.name AS "municipalityName", 
            organisations.name AS "orgName", 
            NULL AS "projectName",
            lower(documents."documentType"::text) AS "documentType", 
            documents.path::text AS "documentPath",
            documents."isTemplate" AS "isTemplate"
          FROM users
          INNER JOIN organisations ON organisations.id = users."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          INNER JOIN documents ON documents."organizationId" = organisations.id
          WHERE users.id = ${userId}
        ) AS combined_documents
        ORDER BY 
          "municipalityName", 
          "orgName", 
          "projectName" ASC NULLS LAST,
          CASE WHEN "documentType" = 'FOLDER' THEN 0 ELSE 1 END,
          "documentPath";
      `;
    }
    case UserType.SUPERUSER_MUNICIPALITY: {
      return await prisma.$queryRaw<Document[]>`
        SELECT * FROM (
          -- Subquery 1: Documents linked to Projects
          SELECT 
            documents.name, 
            municipalities.name AS "municipalityName", 
            organisations.name AS "orgName", 
            projects.name AS "projectName",
            lower(documents."documentType"::text) AS "documentType", 
            documents.path::text AS "documentPath",
            documents."isTemplate" AS "isTemplate"
          FROM users
          INNER JOIN organisations ON organisations."municipalityId" = users."municipalityId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          LEFT JOIN projects ON organisations.id = projects."organizationId"
          INNER JOIN documents ON documents."projectId" = projects.id
          WHERE users.id = ${userId}
          
          UNION ALL
          
          -- Subquery 2: Documents linked directly to Organizations
          SELECT 
            documents.name, 
            municipalities.name AS "municipalityName", 
            organisations.name AS "orgName", 
            NULL AS "projectName",
            lower(documents."documentType"::text) AS "documentType", 
            documents.path::text AS "documentPath",
            documents."isTemplate" AS "isTemplate"
          FROM users
          INNER JOIN organisations ON organisations."municipalityId" = users."municipalityId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          INNER JOIN documents ON documents."organizationId" = organisations.id
          WHERE users.id = ${userId}
        ) AS combined_documents
        ORDER BY 
          "municipalityName", 
          "orgName", 
          "projectName" ASC NULLS LAST,
          CASE WHEN "documentType" = 'FOLDER' THEN 0 ELSE 1 END,
          "documentPath";
      `;
    }
    case UserType.SUPERUSER_GLOBAL: {
      return await prisma.$queryRaw<Document[]>`
        SELECT * FROM (
          -- Subquery 1: Documents linked to Projects
          SELECT 
            documents.name, 
            municipalities.name AS "municipalityName", 
            organisations.name AS "orgName", 
            projects.name AS "projectName",
            lower(documents."documentType"::text) AS "documentType", 
            documents.path::text AS "documentPath",
            documents."isTemplate" AS "isTemplate"
          FROM users
          -- Joins and conditions for project-linked documents
          CROSS JOIN organisations
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          LEFT JOIN projects ON organisations.id = projects."organizationId"
          INNER JOIN documents ON documents."projectId" = projects.id
          WHERE users.id = ${userId}
          
          UNION ALL
          
          -- Subquery 2: Documents linked directly to Organizations
          SELECT 
            documents.name, 
            municipalities.name AS "municipalityName", 
            organisations.name AS "orgName", 
            NULL AS "projectName",
            lower(documents."documentType"::text) AS "documentType", 
            documents.path::text AS "documentPath",
            documents."isTemplate" AS "isTemplate"
          FROM users
          -- Joins and conditions for organization-linked documents
          CROSS JOIN organisations
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          INNER JOIN documents ON documents."organizationId" = organisations.id
          WHERE users.id = ${userId}
        ) AS combined_documents
        ORDER BY 
          "municipalityName", 
          "orgName", 
          "projectName" ASC NULLS LAST,
          CASE WHEN "documentType" = 'FOLDER' THEN 0 ELSE 1 END,
          "documentPath";
    `;
    }
    default:
      throw new Error("Unsupported user type");
  }
}

export async function getContent(
  userId: string,
  municipalityName: string,
  orgName: string,
  projectName: string | undefined,
  documentPath: string,
): Promise<{ content: string }[]> {
  // @ts-ignore
  const user: User | UserDocument = await selectUser(userId);
  // console.log(
  //   `Getting content at:\n Municipality: ${municipalityName}\n Org: ${orgName}\n Project: ${projectName}\n Path: ${documentPath}`,
  // );

  switch (user.userType) {
    case UserType.DEFAULT: {
      if (projectName) {
        // Query when projectName is provided
        return await prisma.$queryRaw<{ content: string }[]>`
          SELECT documents.content
          FROM documents
          INNER JOIN projects ON projects.id = documents."projectId"
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName}
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} 
            AND organisations.id = (SELECT "organizationId" FROM users WHERE id = ${userId})
            AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath})
            AND documents."documentType" = 'FILE'::"DocumentType"
          LIMIT 1
        `;
      } else {
        // Query when projectName is not provided
        return await prisma.$queryRaw<{ content: string }[]>`
          SELECT documents.content
          FROM documents
          INNER JOIN projects ON projects.id = documents."projectId"
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName}
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} 
            AND organisations.id = (SELECT "organizationId" FROM users WHERE id = ${userId})
            AND documents.path = text2ltree(${documentPath})
            AND documents."documentType" = 'FILE'::"DocumentType"
            AND documents."projectId" IS NULL
          LIMIT 1
        `;
      }
    }
    case UserType.SUPERUSER_MUNICIPALITY: {
      if (projectName) {
        // Query when projectName is provided
        return await prisma.$queryRaw<{ content: string }[]>`
          SELECT documents.content
          FROM documents
          INNER JOIN projects ON projects.id = documents."projectId"
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} 
            AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."documentType" = 'FILE'::"DocumentType"
          LIMIT 1;
        `;
      } else {
        // Query when projectName is not provided
        return await prisma.$queryRaw<{ content: string }[]>`
          SELECT documents.content
          FROM documents
          INNER JOIN projects ON projects.id = documents."projectId"
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} 
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."documentType" = 'FILE'::"DocumentType"
            AND documents."projectId" IS NULL
          LIMIT 1;
        `;
      }
    }
    case UserType.SUPERUSER_GLOBAL: {
      if (projectName) {
        // console.log("Getting content for global superuser with project");
        return await prisma.$queryRaw<{ content: string }[]>`
        SELECT documents.content
        FROM documents
        INNER JOIN projects ON projects.id = documents."projectId"
        INNER JOIN organisations ON organisations.id = projects."organizationId"
        INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
        WHERE municipalities.name = ${municipalityName}
          AND organisations.name = ${orgName}
          AND projects.name = ${projectName}
          AND documents.path = text2ltree(${documentPath})
          AND documents."documentType" = 'FILE'::"DocumentType"
        LIMIT 1
        `;
      } else {
        // console.log("Getting content for global superuser without project");
        return await prisma.$queryRaw<{ content: string }[]>`
        SELECT documents.content
        FROM documents
        INNER JOIN organisations ON organisations.id = documents."organizationId"
        INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
        WHERE municipalities.name = ${municipalityName}
          AND organisations.name = ${orgName}
          AND documents.path = text2ltree(${documentPath})
          AND documents."documentType" = 'FILE'::"DocumentType"
          AND documents."projectId" IS NULL
        LIMIT 1
        `;
      }
    }
  }
}

export async function updateContent(
  authorId: string,
  municipalityName: string,
  orgName: string,
  projectName: string | undefined,
  documentPath: string,
  content: string,
) {
  // @ts-ignore
  const user: User | UserDocument = await selectUser(authorId);

  switch (user.userType) {
    case UserType.DEFAULT: {
      // NOTE: This is because currently no matter what the string representation of projectName is passed
      // projectName: this.projectName as string
      // TODO: Actually make this endpoint flexible to accept null as projectName
      if (projectName) {
        return await prisma.$executeRaw`
          UPDATE documents
          SET content = ${content}, "authorId" = ${authorId}
          FROM projects
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${authorId})
            AND organisations.name = ${orgName} 
            AND organisations.id = (SELECT "organizationId" FROM users WHERE id = ${authorId})
            AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."projectId" = projects.id
            AND documents."documentType" = 'FILE'::"DocumentType"
          `;
      } else {
        return await prisma.$executeRaw`
          UPDATE documents
          SET content = ${content}, "authorId" = ${authorId}
          FROM organisations
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${authorId})
            AND organisations.name = ${orgName} 
            AND organisations.id = (SELECT "organizationId" FROM users WHERE id = ${authorId})
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."organizationId" = organisations.id
            AND documents."documentType" = 'FILE'::"DocumentType"
            AND documents."projectId" IS NULL
          `;
      }
    }
    case UserType.SUPERUSER_MUNICIPALITY: {
      if (projectName) {
        return await prisma.$executeRaw`
          UPDATE documents
          SET content = ${content}, "authorId" = ${authorId}
          FROM projects
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${authorId})
            AND organisations.name = ${orgName} 
            AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."projectId" = projects.id
            AND documents."documentType" = 'FILE'::"DocumentType"
          `;
      } else {
        return await prisma.$executeRaw`
          UPDATE documents
          SET content = ${content}, "authorId" = ${authorId}
          FROM organisations
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${authorId})
            AND organisations.name = ${orgName}
            AND documents.path = text2ltree(${documentPath})
            AND documents."organizationId" = organisations.id 
            AND documents."documentType" = 'FILE'::"DocumentType"
            AND documents."projectId" IS NULL
          `;
      }
    }
    case UserType.SUPERUSER_GLOBAL: {
      if (projectName) {
        return await prisma.$executeRaw`
          UPDATE documents
          SET content = ${content}, "authorId" = ${authorId}
          FROM projects
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND organisations.name = ${orgName} 
            AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."projectId" = projects.id
            AND documents."documentType" = 'FILE'::"DocumentType"
          `;
      } else {
        return await prisma.$executeRaw`
          UPDATE documents
          SET content = ${content}, "authorId" = ${authorId}
          FROM organisations
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND organisations.name = ${orgName}
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."organizationId" = organisations.id
            AND documents."documentType" = 'FILE'::"DocumentType"
            AND documents."projectId" IS NULL
          `;
      }
    }
  }
}

export async function deleteDocument(
  userId: string,
  municipalityName: string,
  orgName: string,
  projectName: string | undefined,
  documentPath: string,
) {
  // @ts-ignore
  const user: User | UserDocument = await selectUser(userId);
  switch (user.userType) {
    case UserType.DEFAULT: {
      if (projectName) {
        return await prisma.$executeRaw`
          DELETE FROM documents
          USING projects
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} 
            AND organisations.id = (SELECT "organizationId" FROM users WHERE id = ${userId})
            AND projects.name = ${projectName}
            AND text2ltree(${documentPath}) @> documents.path 
            AND documents."projectId" = projects.id
            -- Check that the document is not a folder with isTemplate tag
            AND NOT (documents."documentType" = 'FOLDER'::"DocumentType" AND documents."isTemplate" = true)
          `;
      } else {
        return await prisma.$executeRaw`
          DELETE FROM documents
          INNER JOIN organisations ON organisations.id = documents."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} 
            AND organisations.id = (SELECT "organizationId" FROM users WHERE id = ${userId})
            AND text2ltree(${documentPath}) @> documents.path 
            AND documents."organizationId" = organisations.id
            AND documents."projectId" IS NULL
            -- Check that the document is not a folder with isTemplate tag
            AND NOT (documents."documentType" = 'FOLDER'::"DocumentType" AND documents."isTemplate" = true)
          `;
      }
    }
    case UserType.SUPERUSER_MUNICIPALITY: {
      if (projectName) {
        return await prisma.$executeRaw`
          DELETE FROM documents
          USING projects
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} 
            AND projects.name = ${projectName}
            AND text2ltree(${documentPath}) @> documents.path 
            AND documents."projectId" = projects.id
            -- Check that the document is not a folder with isTemplate tag
            AND NOT (documents."documentType" = 'FOLDER'::"DocumentType" AND documents."isTemplate" = true)
          `;
      } else {
        return await prisma.$executeRaw`
          DELETE FROM documents
          INNER JOIN organisations ON organisations.id = documents."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} 
            AND text2ltree(${documentPath}) @> documents.path 
            AND documents."organizationId" = organisations.id
            AND documents."projectId" IS NULL
            -- Check that the document is not a folder with isTemplate tag
            AND NOT (documents."documentType" = 'FOLDER'::"DocumentType" AND documents."isTemplate" = true)
          `;
      }
    }
    case UserType.SUPERUSER_GLOBAL: {
      if (projectName) {
        return await prisma.$executeRaw`
          DELETE FROM documents
          USING projects
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND organisations.name = ${orgName} 
            AND projects.name = ${projectName}
            AND text2ltree(${documentPath}) @> documents.path 
            AND documents."projectId" = projects.id
            -- Check that the document is not a folder with isTemplate tag
            AND NOT (documents."documentType" = 'FOLDER'::"DocumentType" AND documents."isTemplate" = true)
          `;
      } else {
        // Validate that it is not the templates folder
        const target = await prisma.$queryRaw<{ documentType: DocumentType; isTemplate: boolean }[]>`
          SELECT documents.id, documents."documentType", documents."isTemplate"
          FROM documents
          WHERE documents.path = text2ltree(${documentPath})
            AND documents."organizationId" = (
              SELECT organisations.id FROM organisations WHERE organisations.name = ${orgName}
            )
            AND documents."projectId" IS NULL
        `;
        if (target && target[0] && target[0].documentType === "FOLDER" && target[0].isTemplate === true) {
          throw new SagError("Cannot delete templates folder.");
        }

        return await prisma.$executeRaw`
          DELETE FROM documents
          USING organisations
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND organisations.name = ${orgName} 
            AND text2ltree(${documentPath}) @> documents.path 
            AND documents."organizationId" = organisations.id
            AND documents."projectId" IS NULL
            -- Check that the document is not a folder with isTemplate tag
            AND NOT (documents."documentType" = 'FOLDER'::"DocumentType" AND documents."isTemplate" = true)
          `;
      }
    }
  }
}

export async function renameDocument(
  userId: string,
  municipalityName: string,
  orgName: string,
  projectName: string | undefined,
  documentPath: string,
  newName: string,
): Promise<string | null> {
  // @ts-ignore
  const user: User | UserDocument = await selectUser(userId);
  const splitIndex = (documentPath as string).lastIndexOf(".");
  const path = splitIndex === -1 ? joinPath("", newName) : joinPath(documentPath.substring(0, splitIndex), newName);

  let result = -1;

  switch (user.userType) {
    case UserType.DEFAULT: {
      if (projectName) {
        result = await prisma.$executeRaw`
          UPDATE documents
          SET name = ${newName}, path = text2ltree(${path})
          FROM projects
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} 
            AND organisations.id = (SELECT "organizationId" FROM users WHERE id = ${userId})
            AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."projectId" = projects.id
          `;
      } else {
        result = await prisma.$executeRaw`
          UPDATE documents
          SET name = ${newName}, path = text2ltree(${path})
          FROM organisations
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} 
            AND organisations.id = (SELECT "organizationId" FROM users WHERE id = ${userId})
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."organizationId" = organisations.id
            AND documents."projectId" IS NULL
            -- Check that the document is not a folder with isTemplate tag
            AND NOT (documents."documentType" = 'FOLDER'::"DocumentType" AND documents."isTemplate" = true)
          `;
      }
    }
    case UserType.SUPERUSER_MUNICIPALITY: {
      if (projectName) {
        result = await prisma.$executeRaw`
          UPDATE documents
          SET name = ${newName}, path = text2ltree(${path})
          FROM projects
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} 
            AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."projectId" = projects.id
          `;
      } else {
        result = await prisma.$executeRaw`
          UPDATE documents
          SET name = ${newName}, path = text2ltree(${path})
          FROM organisations
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND municipalities.id = (SELECT "municipalityId" FROM users WHERE id = ${userId})
            AND organisations.name = ${orgName} 
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."organizationId" = organisations.id
            AND documents."projectId" IS NULL
            -- Check that the document is not a folder with isTemplate tag
            AND NOT (documents."documentType" = 'FOLDER'::"DocumentType" AND documents."isTemplate" = true)
          `;
      }
    }
    case UserType.SUPERUSER_GLOBAL: {
      if (projectName) {
        result = await prisma.$executeRaw`
          UPDATE documents
          SET name = ${newName}, path = text2ltree(${path})
          FROM projects
          INNER JOIN organisations ON organisations.id = projects."organizationId"
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND organisations.name = ${orgName} 
            AND projects.name = ${projectName}
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."projectId" = projects.id
          `;
      } else {
        result = await prisma.$executeRaw`
          UPDATE documents
          SET name = ${newName}, path = text2ltree(${path})
          FROM organisations
          INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
          WHERE municipalities.name = ${municipalityName} 
            AND organisations.name = ${orgName} 
            AND documents.path = text2ltree(${documentPath}) 
            AND documents."organizationId" = organisations.id
            AND documents."projectId" IS NULL
            -- Check that the document is not a folder with isTemplate tag
            AND NOT (documents."documentType" = 'FOLDER'::"DocumentType" AND documents."isTemplate" = true)
          `;
      }
    }
  }
  if (result === 1) {
    await updateChildPaths(municipalityName, orgName, projectName, documentPath, path);
    return path;
  }
  return null;
}

export async function saveAsTemplate(userId: string, organizationName: string, name: string, content: string) {
  const organization = await selectOrganization(organizationName);
  if (!organization) {
    throw new SagError(`Organization ${organizationName} does not exist`);
  }

  // @ts-ignore
  const user: User | UserDocument | null = await selectUser(userId);
  if (!user) {
    throw new SagError(`User ${userId} does not exist`);
  }
  console.log("User is trying to author a new template:", user.email);
  // TODO: Check if user has permissions to create a template in the organisation
  // - Just check that user is a member of the organisation - superuserglobal, superusermunicipality, default
  if (user.userType === UserType.SUPERUSER_MUNICIPALITY) {
    // TODO: Check that the user's municipality has the organisation as a member
    const isOrgInUserMunicipality = await prisma.organization.findFirst({
      where: {
        id: organization.id,
        municipalityId: user.municipalityId,
      },
    });

    if (!isOrgInUserMunicipality) {
      throw new SagError("User does not have permissions to create a template in this organization.");
    }
  } else if (user.userType === UserType.DEFAULT) {
    // Check that the user's organisation is the same as the template's organisation
    if (user.organizationId !== organization.id) {
      throw new SagError("User does not have permissions to create a template in this organisation");
    }
  } // ELSE: Superuser global can create templates in any organisation

  // Check if a template with the same name already exists in the organisation
  const templatePath = joinPath("templates", name);
  const existingTemplate = await prisma.$executeRaw`
    SELECT * FROM documents
    WHERE "organizationId" = ${organization.id}
      AND path = text2ltree(${templatePath})
      AND name = ${name}
      AND "isTemplate" = ${true}
      AND "documentType" = 'FILE'::"DocumentType"
  `;
  // console.log("Trying to create a template with path:", templatePath);
  // console.log("Existing template:", existingTemplate);
  if (existingTemplate) {
    throw new SagError(`Template "${name}" already exists in organization "${organizationName}".`);
  }

  // Create the template
  try {
    const result = await prisma.$executeRaw`
      INSERT INTO documents (id, name, content, "authorId", "organizationId", path, "documentType", "isTemplate")
      VALUES (
        ${createId()},
        ${name},
        ${content},
        ${userId},
        ${organization.id},
        text2ltree(${templatePath}),
        'FILE'::"DocumentType",
        true
      );`;

    return templatePath;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      switch (e.code) {
        case "P2002":
          throw new SagError(`Template with name "${name}" already exists.`);
        case "P2010":
          throw new SagError("Can't create template, invalid permissions.");
        default:
          throw e; // Re-throw unexpected Prisma errors
      }
    }
    throw e; // Re-throw non-Prisma errors
  }
}

async function updateChildPaths(
  municipalityName: string,
  orgName: string,
  projectName: string | undefined,
  documentPath: string,
  newPath: string,
) {
  let children: { id: string; path: string }[] = [];
  if (projectName) {
    children = await prisma.$queryRaw<{ id: string; path: string }[]>`
      SELECT documents.id as "id", path::text
      FROM documents
      INNER JOIN projects ON projects.id = documents."projectId"
      INNER JOIN organisations ON organisations.id = projects."organizationId"
      INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
      WHERE projects.name = ${projectName} 
        AND organisations.name = ${orgName} 
        AND municipalities.name = ${municipalityName}
        AND text2ltree(${documentPath}) @> documents.path 
        AND documents.path != text2ltree(${documentPath})
      `;
  } else {
    children = await prisma.$queryRaw<{ id: string; path: string }[]>`
      SELECT documents.id as "id", path::text
      FROM documents
      INNER JOIN organisations ON organisations.id = documents."organizationId"
      INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
      WHERE organisations.name = ${orgName} 
        AND municipalities.name = ${municipalityName}
        AND text2ltree(${documentPath}) @> documents.path 
        AND documents.path != text2ltree(${documentPath})
        AND documents."projectId" IS NULL
      `;
  }
  for (const child of children) {
    const newPathChild = child.path.replace(documentPath, newPath);
    await prisma.$executeRaw`
      UPDATE documents
      SET path = text2ltree(${newPathChild})
      WHERE id = ${child.id}
      `;
  }
}

/**
 * Checks if a document with a `possibleName` exists in the database
 * if `isNew` is true, check is done with an
 */
export async function checkPathExists(
  possibleName: string,
  municipalityName: string,
  orgName: string,
  projectName: string | undefined,
  path: string,
  isNew: boolean,
): Promise<boolean> {
  if (isNew) {
    path = joinPath(path, possibleName);
  } else {
    const splitIndex = (path as string).lastIndexOf(".");
    path = splitIndex === -1 ? joinPath("", possibleName) : joinPath(path.substring(0, splitIndex), possibleName);
  }
  let result: { path: string }[] = [];
  if (projectName) {
    result = await prisma.$queryRaw<{ path: string }[]>`
      SELECT path::text
      FROM documents
      INNER JOIN projects ON projects.id = documents."projectId"
      INNER JOIN organisations ON organisations.id = projects."organizationId"
      INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
      WHERE projects.name = ${projectName} 
        AND organisations.name = ${orgName} 
        AND municipalities.name = ${municipalityName}
        AND documents.path = text2ltree(${path}) 
        AND documents.name = ${possibleName}
      `;
  } else {
    result = await prisma.$queryRaw<{ path: string }[]>`
      SELECT path::text
      FROM documents
      INNER JOIN organisations ON organisations.id = documents."organizationId"
      INNER JOIN municipalities ON municipalities.id = organisations."municipalityId"
      WHERE organisations.name = ${orgName} 
        AND municipalities.name = ${municipalityName}
        AND documents.path = text2ltree(${path}) 
        AND documents.name = ${possibleName}
        AND documents."projectId" IS NULL
      `;
  }
  return result.length > 0;
}

export * as sql from "./sql";
