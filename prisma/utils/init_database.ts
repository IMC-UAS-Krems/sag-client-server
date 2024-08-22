import { PrismaClient, Prisma, UserType } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

const prisma = new PrismaClient();

try {
  await prisma.municipality.createMany({
    data: [{ name: "Tulln" }, { name: "Wiener Neustadt" }, { name: "Krems" }, { name: "St. Pölten" }],
  });

  await prisma.organization.create({
    data: {
      name: "Imc",
      municipality: {
        connect: { name: "Krems" },
      },
    },
  });

  await prisma.organization.create({
    data: {
      name: "Sagittarius",
      municipality: {
        connect: { name: "Krems" },
      },
    },
  });

  await prisma.organization.create({
    data: {
      name: "FHSTP",
      municipality: {
        connect: { name: "St. Pölten" },
      },
    },
  });

  await prisma.project.create({
    data: {
      name: "Project 1",
      organization: {
        connect: { name: "Imc" },
      },
    },
  });

  await prisma.project.create({
    data: {
      name: "Project 2",
      organization: {
        connect: { name: "Imc" },
      },
    },
  });

  await prisma.project.create({
    data: {
      name: "Project 1",
      organization: {
        connect: { name: "Sagittarius" },
      },
    },
  });

  await prisma.project.create({
    data: {
      name: "Project 2",
      organization: {
        connect: { name: "Sagittarius" },
      },
    },
  });

  await prisma.project.create({
    data: {
      name: "Project 1",
      organization: {
        connect: { name: "FHSTP" },
      },
    },
  });

  await prisma.project.create({
    data: {
      name: "Project 2",
      organization: {
        connect: { name: "FHSTP" },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: "clxy0d4xo0003sw97z0cqzc0s",
      name: "default",
      email: "email@example6.com",
      username: "email@example6.com",
      password: "password123",
      userRole: "USER",
      userType: UserType.SUPERUSER_GLOBAL,
      organization: {
        connect: { name: "Imc" },
      },
      municipality: {
        connect: { name: "Krems" },
      },
      project: undefined,
    },
  });

  await prisma.user.create({
    data: {
      id: "clxy0d4xo0003sw97z0cqzc0h",
      name: "Example Admin",
      email: "admin@example.com",
      username: "admin",
      password: "password123",
      userRole: "ADMIN",
      userType: UserType.SUPERUSER_GLOBAL,
      organization: {
        connect: { name: "Sagittarius" },
      },
      municipality: {
        connect: { name: "Krems" },
      },
      project: undefined,
    },
  });

  await prisma.user.create({
    data: {
      id: "clxy0d4xo0003sw97z0cqzc0c",
      name: "test",
      email: "test@mail.com",
      username: "test@mail.com",
      password: "password123",
      userRole: "USER",
      organization: {
        connect: { name: "Sagittarius" },
      },
      municipality: {
        connect: { name: "Krems" },
      },
      project: undefined,
    },
  });

  await prisma.user.create({
    data: {
      id: "clxy0d4xo0003sw97z0cqzc1c",
      name: "Mike",
      email: "mike@mail.com",
      username: "mike@mail.com",
      password: "password123",
      userRole: "USER",
      organization: {
        connect: { name: "FHSTP" },
      },
      municipality: {
        connect: { name: "St. Pölten" },
      },
      project: undefined,
    },
  });

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path)
        VALUES (${createId()}, 'File 1', 'text\ntext', (SELECT id from users WHERE users.name = 'default'),
        (SELECT id FROM projects WHERE projects.name = 'Project 1'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'Imc')), 'File-1');`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path)
        VALUES (${createId()}, 'File 2', 'text\ntext', (SELECT id from users WHERE users.name = 'default'),
        (SELECT id FROM projects WHERE projects.name = 'Project 1'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'Imc')), 'File-2');`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path, "documentType")
        VALUES (${createId()}, 'Folder 1', 'text\ntext', (SELECT id from users WHERE users.name = 'default'),
        (SELECT id FROM projects WHERE projects.name = 'Project 1'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'Imc')), 'Folder-1', 'FOLDER'::"DocumentType");`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path)
        VALUES (${createId()}, 'File 1', 'text\ntext', (SELECT id from users WHERE users.name = 'default'),
        (SELECT id FROM projects WHERE projects.name = 'Project 1'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'Imc')), 'Folder-1.File-1');`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path)
        VALUES (${createId()}, 'File 1', 'text\ntext', (SELECT id from users WHERE users.name = 'default'),
        (SELECT id FROM projects WHERE projects.name = 'Project 2'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'Imc')), 'File-1');`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path)
        VALUES (${createId()}, 'File 1', 'text\ntext', (SELECT id from users WHERE users.name = 'test'),
        (SELECT id FROM projects WHERE projects.name = 'Project 1'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'Sagittarius')), 'File-1');`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path)
        VALUES (${createId()}, 'File 2', 'text\ntext', (SELECT id from users WHERE users.name = 'test'),
        (SELECT id FROM projects WHERE projects.name = 'Project 1'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'Sagittarius')), 'File-2');`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path, "documentType")
        VALUES (${createId()}, 'Folder 1', 'text\ntext', (SELECT id from users WHERE users.name = 'test'),
        (SELECT id FROM projects WHERE projects.name = 'Project 1'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'Sagittarius')), 'Folder-1', 'FOLDER'::"DocumentType");`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path)
        VALUES (${createId()}, 'File 1', 'text\ntext', (SELECT id from users WHERE users.name = 'test'),
        (SELECT id FROM projects WHERE projects.name = 'Project 1'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'Sagittarius')), 'Folder-1.File-1');`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path)
        VALUES (${createId()}, 'File 1', 'text\ntext', (SELECT id from users WHERE users.name = 'test'),
        (SELECT id FROM projects WHERE projects.name = 'Project 2'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'Sagittarius')), 'File-1');`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path)
        VALUES (${createId()}, 'File 1', 'text\ntext', (SELECT id from users WHERE users.name = 'Mike'),
        (SELECT id FROM projects WHERE projects.name = 'Project 1'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'FHSTP')), 'File-1');`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path)
        VALUES (${createId()}, 'File 2', 'text\ntext', (SELECT id from users WHERE users.name = 'Mike'),
        (SELECT id FROM projects WHERE projects.name = 'Project 1'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'FHSTP')), 'File-2');`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path, "documentType")
        VALUES (${createId()}, 'Folder 1', 'text\ntext', (SELECT id from users WHERE users.name = 'Mike'),
        (SELECT id FROM projects WHERE projects.name = 'Project 1'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'FHSTP')), 'Folder-1', 'FOLDER'::"DocumentType");`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path)
        VALUES (${createId()}, 'File 1', 'text\ntext', (SELECT id from users WHERE users.name = 'Mike'),
        (SELECT id FROM projects WHERE projects.name = 'Project 1'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'FHSTP')), 'Folder-1.File-1');`;

  await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "projectId", path)
        VALUES (${createId()}, 'File 1', 'text\ntext', (SELECT id from users WHERE users.name = 'Mike'),
        (SELECT id FROM projects WHERE projects.name = 'Project 2'
        AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = 'FHSTP')), 'File-1');`;
} catch (error) {
  console.error("Error seeding data:", error);
} finally {
  await prisma.$disconnect();
}

process.exit(0);
