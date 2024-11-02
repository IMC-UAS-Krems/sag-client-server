enum SagDocumentType {
  FILE = "FILE",
  FOLDER = "FOLDER",
  MUNICIPALITY = "MUNICIPALITY",
  ORG = "ORG",
  PROJECT = "PROJECT",
}

type SagDocument = {
  name: string;
  municipalityName: string;
  orgName: string;
  projectName: string;
  documentType: SagDocumentType;
  documentPath: string;
};

export class TreeNode {
  children: TreeNode[] = [];
  name: string;
  docType: SagDocumentType;
  isExpanded = false;
  isSelected = false;
  content: string | null = null;

  constructor(name: string, docType: SagDocumentType) {
    this.name = name;
    this.docType = docType;
  }

  addChild(child: TreeNode) {
    this.children.push(child);
  }

  printTree(depth = 0) {
    console.log(`${"  ".repeat(depth)}${this.icon()}${this.name}`);
    this.children.forEach((child) => {
      child.printTree(depth + 1);
    });
  }

  findChild(name: string) {
    return this.children.find((child) => child.name === name);
  }

  icon() {
    switch (this.docType) {
      case SagDocumentType.FILE:
        return "📄";
      case SagDocumentType.FOLDER:
        return "📁";
      case SagDocumentType.MUNICIPALITY:
        return "🏠";
      case SagDocumentType.ORG:
        return "🏢";
      case SagDocumentType.PROJECT:
        return "🏗️";
    }
  }
}

class FileTree {
  root: TreeNode;
  constructor() {
    this.root = new TreeNode("root", SagDocumentType.FOLDER);
  }

  addDocument(doc: SagDocument) {
    const path = doc.documentPath.split(".");
    this.addMunicipality(doc.municipalityName);
    this.addOrg(doc.orgName, doc.municipalityName);
    this.addProject(doc.projectName, doc.orgName, doc.municipalityName);
    let currentNode = this.root.findChild(doc.municipalityName)?.findChild(doc.orgName)?.findChild(doc.projectName);

    path.slice(0, -1).forEach((folder) => {
      currentNode = currentNode?.findChild(folder);
    });
    currentNode?.addChild(new TreeNode(doc.name, doc.documentType));
  }

  addMunicipality(municipality: string) {
    if (this.root.findChild(municipality) == null) {
      this.root.addChild(new TreeNode(municipality, SagDocumentType.MUNICIPALITY));
    }
  }

  addOrg(org: string, municipality: string) {
    const municipalityNode = this.root.findChild(municipality);
    if (municipalityNode?.findChild(org) == null) {
      municipalityNode?.addChild(new TreeNode(org, SagDocumentType.ORG));
    }
  }

  addProject(project: string, org: string, municipality: string) {
    const municipalityNode = this.root.findChild(municipality);
    const orgNode = municipalityNode?.findChild(org);
    if (orgNode?.findChild(project) == null) {
      orgNode?.addChild(new TreeNode(project, SagDocumentType.PROJECT));
    }
  }

  printTree() {
    for (const child of this.root.children) {
      child.printTree();
    }
  }
}

(async () => {
  const documents: SagDocument[] = await fetch("http://localhost:9512/api/documents", {
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      cookie:
        "access_token=29866a35dfda745f817c30ed44c9b79d.6c7f99a474fe26f8bcef8b0de65dcc57a82ffd309a1f8388a11287ce5b538771cc4d4eab95b76e14cb2adb0fec2527553ee48a0c8d77090e9c21173bc49a8c81",
      Referer: "http://localhost/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    method: "GET",
  }).then((res) => res.json());
  const fileTree = new FileTree();
  documents.forEach((doc) => fileTree.addDocument(doc));
  fileTree.printTree();
})();
