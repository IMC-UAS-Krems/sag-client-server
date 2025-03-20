import { PrismaClient, Prisma, UserType, UserRole } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

const prisma = new PrismaClient();

try {
  // Create municipalities
  await prisma.municipality.createMany({
    data: [{ name: "Tulln" }, { name: "Wiener Neustadt" }, { name: "Krems" }, { name: "St. Pölten" }],
  });

  // Create organizations
  const organizations = [
    { name: "Imc", municipality: "Krems" },
    { name: "Sagittarius", municipality: "Krems" },
    { name: "FHSTP", municipality: "St. Pölten" },
    { name: "OGK", municipality: "Krems" },
  ];

  for (const organization of organizations) {
    await prisma.organization.create({
      data: {
        name: organization.name,
        municipality: {
          connect: { name: organization.municipality },
        },
      },
    });
  }

  // Create projects
  const projects = [
    { name: "Project 1", organization: "Imc" },
    { name: "Project 2", organization: "Imc" },
    { name: "Project 1", organization: "Sagittarius" },
    { name: "Project 2", organization: "Sagittarius" },
    { name: "Project 1", organization: "FHSTP" },
    { name: "Project 2", organization: "FHSTP" },
  ];

  for (const project of projects) {
    await prisma.project.create({
      data: {
        name: project.name,
        organization: {
          connect: { name: project.organization },
        },
      },
    });
  }

  // Create users
  const users = [
    {
      id: "clxy0d4xo0003sw97z0cqzc0s",
      name: "default",
      email: "email@example6.com",
      username: "email@example6.com",
      password: "password123",
      userRole: "Developer",
      userType: UserType.SUPERUSER_GLOBAL,
      organizationName: "Imc",
      municipalityName: "Krems",
      verified: true,
    },
    {
      id: "clxy0d4xo0003sw97z0cqzc0h",
      name: "Example Admin",
      email: "admin@example.com",
      username: "example_admin",
      password: "password123",
      userRole: "Administrator",
      userType: UserType.SUPERUSER_GLOBAL,
      organizationName: "Sagittarius",
      municipalityName: "Krems",
      verified: true,
    },
    {
      id: "clxy0d4xo0003sw97z0cqzc0c",
      name: "test",
      email: "test@mail.com",
      username: "test@mail.com",
      password: "password123",
      userRole: "Manager",
      userType: UserType.SUPERUSER_MUNICIPALITY,
      organizationName: "Sagittarius",
      municipalityName: "Krems",
      verified: true,
    },
    {
      id: "clxy0d4xo0003sw97z0cqzc1c",
      name: "Mike",
      email: "mike@mail.com",
      username: "mike@mail.com",
      password: "password123",
      userRole: "Developer",
      userType: UserType.DEFAULT,
      organizationName: "FHSTP",
      municipalityName: "St. Pölten",
      verified: true,
    },
    {
      id: "clxy0d4xo0003sw97z0cqzc8h",
      name: "FHSTP Admin",
      email: "admin@fhstp.com",
      username: "fhstp_admin",
      password: "password123",
      userRole: "Administrator",
      userType: UserType.SUPERUSER_GLOBAL,
      organizationName: "FHSTP",
      municipalityName: "St. Pölten",
      verified: true,
    },
    {
      id: "clxy0d4xo0003sw97z0cqzc5b",
      name: "IMC Admin",
      email: "admin@imc.com",
      username: "imc_admin",
      password: "password123",
      userRole: "Administrator",
      userType: UserType.SUPERUSER_GLOBAL,
      organizationName: "Imc",
      municipalityName: "Krems",
      verified: true,
    },
    {
      id: "clxy0d4xo0003sw97z0cqzc4g",
      name: "FHSTP Manager",
      email: "manager@fhstp.com",
      username: "manager_fhstp",
      password: "password123",
      userRole: "Manager",
      userType: UserType.DEFAULT,
      organizationName: "FHSTP",
      municipalityName: "St. Pölten",
      verified: true,
    },
    {
      id: "clxy0d4xo0003sw97z0cqzc7u",
      name: "Deleted Example",
      email: "deleted@example.com",
      username: "deleted_example",
      password: "password123",
      userRole: "Developer",
      userType: UserType.DEFAULT,
      organizationName: "FHSTP",
      municipalityName: "St. Pölten",
      deleted: true,
      needsToBeLoggedOut: true,
      verified: true,
    },
    {
      id: "clxy0d4xo0003sw97z0cqzb9r",
      name: "Unverified Example",
      email: "unverified@example.com",
      username: "unverified_example",
      password: "password123",
      userRole: "Developer",
      userType: UserType.DEFAULT,
      organizationName: "FHSTP",
      municipalityName: "St. Pölten",
      verified: false,
    },
  ];

  for (const user of users) {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        password: user.password,
        userRole: user.userRole ? (user.userRole as UserRole) : "Developer",
        userType: user.userType ? user.userType : UserType.DEFAULT,
        organization: {
          connect: { name: user.organizationName },
        },
        municipality: {
          connect: { name: user.municipalityName },
        },
        deleted: user.deleted ? user.deleted : false,
        needsToBeLoggedOut: user.needsToBeLoggedOut ? user.needsToBeLoggedOut : false,
        verified: user.verified ? user.verified : false,
      },
    });
  }

  // Helper for creating paths
  function joinPath(path: string, name: string): string {
    path =
      path.length == 0 ? name.toLowerCase().replaceAll(" ", "-") : `${path}.${name.toLowerCase().replaceAll(" ", "-")}`;
    return path;
  }

  // Create folders and documents
  const documents = [
    {
      name: "File 1",
      content: "text\ntext",
      projectName: "Project 1",
      organizationName: "Imc",
    },
    {
      name: "File 2",
      content: "text\ntext",
      projectName: "Project 1",
      organizationName: "Imc",
    },
    {
      name: "Folder 1",
      content: "text\ntext",
      projectName: "Project 1",
      organizationName: "Imc",
      documentType: "FOLDER",
    },
    {
      name: "File 1",
      content: "text\ntext",
      projectName: "Project 1",
      organizationName: "Imc",
      parentPath: "folder-1",
    },
    {
      name: "File 1",
      content: "text\ntext",
      projectName: "Project 2",
      organizationName: "Imc",
    },
    {
      name: "File 1",
      content: "text\ntext",
      authorName: "test",
      projectName: "Project 1",
      organizationName: "Sagittarius",
    },
    {
      name: "File 2",
      content: "text\ntext",
      authorName: "test",
      projectName: "Project 1",
      organizationName: "Sagittarius",
    },
    {
      name: "Folder 1",
      content: "text\ntext",
      authorName: "test",
      projectName: "Project 1",
      organizationName: "Sagittarius",
      documentType: "FOLDER",
    },
    {
      name: "File 1",
      content: "text\ntext",
      authorName: "test",
      projectName: "Project 1",
      organizationName: "Sagittarius",
      parentPath: "folder-1",
    },
    {
      name: "File 1",
      content: "text\ntext",
      authorName: "test",
      projectName: "Project 2",
      organizationName: "Sagittarius",
    },
    {
      name: "File 1",
      content: "text\ntext",
      authorName: "Mike",
      projectName: "Project 1",
      organizationName: "FHSTP",
    },
    {
      name: "File 2",
      content: "text\ntext",
      authorName: "Mike",
      projectName: "Project 1",
      organizationName: "FHSTP",
    },
    {
      name: "Folder 1",
      content: "text\ntext",
      authorName: "Mike",
      projectName: "Project 1",
      organizationName: "FHSTP",
      documentType: "FOLDER",
    },
    {
      name: "File 1",
      content: "text\ntext",
      authorName: "Mike",
      projectName: "Project 1",
      organizationName: "FHSTP",
      parentPath: "folder-1",
    },
    {
      name: "File 1",
      content: "text\ntext",
      authorName: "Mike",
      projectName: "Project 2",
      organizationName: "FHSTP",
    },
  ];

  // TODO: In the future this should probably be built dynamically and allow for creation of documents without projects
  for (const document of documents) {
    await prisma.$executeRaw`INSERT INTO documents (id, name, content, "authorId", "organizationId", "projectId", path, "documentType")
        VALUES (
          ${createId()},
          ${document.name},
          ${document.content},
          (SELECT id from users WHERE users.name = ${document.authorName ? document.authorName : "default"}),
          (SELECT id FROM organisations WHERE organisations.name = ${document.organizationName}),
          (SELECT id FROM projects WHERE projects.name = ${document.projectName} AND projects."organizationId" = (SELECT id FROM organisations WHERE organisations.name = ${document.organizationName})), 
          text2ltree(${joinPath(document.parentPath ? document.parentPath : "", document.name)}),
          ${document.documentType ? document.documentType : "FILE"}::"DocumentType");`;
  }

  // Creating template folders and templates for the organizations
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

  for (const organization of organizations) {
    // Add templates folder to the organization's top level
    await prisma.$executeRaw`
      INSERT INTO documents (id, name, content, "authorId", "organizationId", path, "documentType", "isTemplate")
      VALUES (
        ${createId()},
        'Templates',
        'This is the template folder for the current organisation',
        (SELECT id FROM users WHERE users.name = 'default'),
        (SELECT id FROM organisations WHERE organisations.name = ${organization.name}),
        text2ltree('templates'),
        'FOLDER'::"DocumentType",
        true
      );
    `;

    // Add example templates
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
  }
} catch (error) {
  console.error("Error seeding data:", error);
} finally {
  await prisma.$disconnect();
}

process.exit(0);
