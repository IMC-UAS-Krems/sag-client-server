import { For, onMount, batch, createSignal, useContext, Show, Accessor, Suspense, Setter, JSXElement } from "solid-js";
import { eden } from "@client/api";
import { theme } from "@store/index";
import { file } from "bun";
import { createMutable } from "solid-js/store";
import { EditorContext } from "@client/routes/Editor";
import { IEditorContext } from "@client/types";
import { ContextMenu } from "@kobalte/core/context-menu";

enum SagDocumentType {
  FILE = "FILE",
  FOLDER = "FOLDER",
  MUNICIPALITY = "MUNICIPALITY",
  ORG = "ORG",
  PROJECT = "PROJECT",
}

enum MenuOption {
  Save = "Save",
  Delete = "Delete",
  Rename = "Rename",
  AddFile = "Add File",
  AddFolder = "Add Folder",
}

type SagDocument = {
  name: string;
  municipalityName: string;
  orgName: string;
  projectName: string;
  documentType: string;
  documentPath: string;
};

class TreeNode {
  children: TreeNode[];
  name: Accessor<string>;
  setName: Setter<string>;
  docType: SagDocumentType;
  path: Accessor<string | null>;
  setPath: Setter<string | null>;
  isExpanded: boolean;
  projectName: string | null;
  orgName: string | null;
  municipalityName: string | null;
  parent: TreeNode | null;

  constructor(
    name: string,
    docType: SagDocumentType,
    path: string | null = null,
    projectName: string | null = null,
    orgName: string | null = null,
    municipalityName: string | null = null,
    parent: TreeNode | null = null,
  ) {
    [this.name, this.setName] = createSignal(name);
    this.docType = docType;
    [this.path, this.setPath] = createSignal(path);
    this.isExpanded = false;
    this.projectName = projectName;
    this.orgName = orgName;
    this.municipalityName = municipalityName;
    this.children = createMutable([]);
    this.parent = parent;
  }

  addChild(child: TreeNode) {
    this.children.push(child); // Direct mutation is fine with createMutable
  }

  findChild(params: { name: string } | { path: string }) {
    if ("name" in params) {
      return this.children.find((child) => child.name() === params.name);
    }
    return this.children.find((child) => params.path.startsWith(child.path()));
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

  getChildren() {
    return this.children;
  }

  async createDocument(name: string, docType: SagDocumentType, path: string) {
    const resp = await eden.api.document.post({
      name: name,
      documentType: docType.toString().toLowerCase(),
      path: path,
      projectName: this.projectName as string,
      organizationName: this.orgName as string,
      municipalityName: this.municipalityName as string,
      $fetch: {
        mode: "cors",
        credentials: "include",
      },
    });

    if (resp.status === 200) {
      this.addChild(
        new TreeNode(name, docType, resp.data as string, this.projectName, this.orgName, this.municipalityName),
      );
    }
  }

  async deleteDocument() {
    const resp = await eden.api.document.delete({
      path: this.path() as string,
      projectName: this.projectName as string,
      organizationName: this.orgName as string,
      municipalityName: this.municipalityName as string,
      $fetch: {
        mode: "cors",
        credentials: "include",
      },
    });

    if (resp.status === 200) {
      const index = this.parent?.children.findIndex((child) => child.name() === this.name());
      if (index !== undefined) {
        this.parent?.children.splice(index, 1);
      }
    }
  }

  async getContent(): Promise<string> {
    const resp = await eden.api.document_content.get({
      $query: {
        projectName: this.projectName as string,
        organizationName: this.orgName as string,
        municipalityName: this.municipalityName as string,
        path: this.path() as string,
      },
      $fetch: {
        mode: "cors",
        credentials: "include",
      },
    });

    if (resp.status === 200) {
      return resp.data as string;
    }
    return "";
  }

  async saveContent(content: string) {
    const resp = await eden.api.document_content.put({
      content: content,
      projectName: this.projectName as string,
      organizationName: this.orgName as string,
      municipalityName: this.municipalityName as string,
      path: this.path() as string,
      $fetch: {
        mode: "cors",
        credentials: "include",
      },
    });
    if (resp.status !== 200) {
      console.error("Error saving content");
    }
  }

  async renameDocument() {
    const newName = prompt("Enter new name:");
    if (newName) {
      const resp = await eden.api.document.put({
        newName: newName,
        projectName: this.projectName as string,
        organizationName: this.orgName as string,
        municipalityName: this.municipalityName as string,
        path: this.path() as string,
        $fetch: {
          mode: "cors",
          credentials: "include",
        },
      });

      if (resp.status === 200) {
        this.setName(newName);
        this.updatePath(resp.data as string);
      }
    }
  }

  updatePath(path: string) {
    this.setPath(this.path().replace(this.path(), path));
    for (const child of this.children) {
      child.updatePath(path);
    }
  }
}

class FileTree {
  root: TreeNode;

  constructor() {
    this.root = createMutable(new TreeNode("root", SagDocumentType.FOLDER));
  }

  addDocument(doc: SagDocument) {
    const pathSplit = doc.documentPath.lastIndexOf(".");
    const path = pathSplit === -1 ? doc.documentPath : doc.documentPath.slice(0, pathSplit);

    this.addMunicipality(doc.municipalityName);
    this.addOrg(doc.orgName, doc.municipalityName);
    this.addProject(doc.projectName, doc.orgName, doc.municipalityName);

    let currentNode = this.root
      .findChild({ name: doc.municipalityName })
      ?.findChild({ name: doc.orgName })
      ?.findChild({ name: doc.projectName });

    for (let i = 1; i < doc.documentPath.split(".").length; i++) {
      currentNode = currentNode?.findChild({ path: path });
    }
    currentNode?.addChild(
      new TreeNode(
        doc.name,
        SagDocumentType[doc.documentType.toUpperCase() as keyof typeof SagDocumentType],
        doc.documentPath,
        doc.projectName,
        doc.orgName,
        doc.municipalityName,
        currentNode,
      ),
    );
  }

  addMunicipality(municipality: string) {
    if (this.root.findChild({ name: municipality }) == null) {
      this.root.addChild(new TreeNode(municipality, SagDocumentType.MUNICIPALITY));
    }
  }

  addOrg(org: string, municipality: string) {
    const municipalityNode = this.root.findChild({ name: municipality });
    if (municipalityNode?.findChild({ name: org }) == null) {
      municipalityNode?.addChild(new TreeNode(org, SagDocumentType.ORG));
    }
  }

  addProject(project: string, org: string, municipality: string) {
    const municipalityNode = this.root.findChild({ name: municipality });
    const orgNode = municipalityNode?.findChild({ name: org });
    if (orgNode?.findChild({ name: project }) == null) {
      orgNode?.addChild(new TreeNode(project, SagDocumentType.PROJECT));
    }
  }

  getChildren() {
    return this.root.getChildren();
  }
}

const [selectedNode, setSelectedNode] = createSignal<TreeNode | null>(null);

function FileNode(props: { node: TreeNode }) {
  let expandDiv: HTMLDivElement;
  const { handleFileClick } = useContext(EditorContext) as IEditorContext;

  function toggleExpanded() {
    if (!props.node.isExpanded) {
      expandDiv.style.gridTemplateRows = "1fr";
    } else {
      expandDiv.style.gridTemplateRows = "0fr";
    }
    props.node.isExpanded = !props.node.isExpanded;
  }

  return (
    <div class="flex flex-col">
      <Suspense>
        <ContextMenu.Trigger disabled={![SagDocumentType.FOLDER, SagDocumentType.FILE].includes(props.node.docType)}>
          <button
            class="flex flex-row"
            onClick={
              props.node.docType === SagDocumentType.FILE
                ? async () => handleFileClick(await props.node.getContent())
                : toggleExpanded
            }
            onContextMenu={() => {
              if ([SagDocumentType.FOLDER, SagDocumentType.FILE].includes(props.node.docType)) {
                setSelectedNode(props.node);
              }
            }}
          >
            <span class="mr-2">{props.node.icon()}</span>
            <span>{props.node.name()}</span>
          </button>
        </ContextMenu.Trigger>
      </Suspense>

      <div
        ref={expandDiv}
        class="transition-all duration-400 overflow-hidden grid"
        style={{ "grid-template-rows": "0fr" }}
      >
        <div class="ml-4 min-h-0">
          <For each={props.node.getChildren()}>{(child) => <FileNode node={child} />}</For>
        </div>
      </div>
    </div>
  );
}

function FileContextMenu(props: { children: JSXElement }) {
  const { code } = useContext(EditorContext) as IEditorContext;

  function handleContextMenu(action: MenuOption) {
    const node = selectedNode();
    switch (action) {
      case MenuOption.AddFile: {
        const name = prompt("Enter file name:");
        if (name) {
          node?.createDocument(name, SagDocumentType.FILE, node.path() as string);
        }
        break;
      }
      case MenuOption.AddFolder: {
        const name = prompt("Enter folder name:");
        if (name) {
          node?.createDocument(name, SagDocumentType.FOLDER, node.path() as string);
        }
        break;
      }
      case MenuOption.Delete: {
        node?.deleteDocument();
        break;
      }
      case MenuOption.Save: {
        node?.saveContent(code());
        break;
      }
      case MenuOption.Rename: {
        node?.renameDocument();
        break;
      }
    }
  }
  return (
    <ContextMenu>
      <ContextMenu.Portal>
        <ContextMenu.Content class="bg-white border border-gray-200 rounded shadow-lg">
          <ul class="py-1">
            <ContextMenu.Item
              class="px-4 py-2 cursor-pointer hover:bg-gray-100"
              onSelect={() => {
                handleContextMenu(MenuOption.Rename);
              }}
            >
              {MenuOption.Rename}
            </ContextMenu.Item>
            <Show when={selectedNode()?.docType === SagDocumentType.FILE}>
              <ContextMenu.Item
                class="px-4 py-2 cursor-pointer hover:bg-gray-100"
                onSelect={() => {
                  handleContextMenu(MenuOption.Save);
                }}
              >
                {MenuOption.Save}
              </ContextMenu.Item>
            </Show>
            <ContextMenu.Item
              class="px-4 py-2 cursor-pointer hover:bg-gray-100"
              onSelect={() => {
                handleContextMenu(MenuOption.Delete);
              }}
            >
              {MenuOption.Delete}
            </ContextMenu.Item>
            <Show when={selectedNode()?.docType === SagDocumentType.FOLDER}>
              <ContextMenu.Item
                class="px-4 py-2 cursor-pointer hover:bg-gray-100"
                onSelect={() => {
                  handleContextMenu(MenuOption.AddFile);
                }}
              >
                {MenuOption.AddFile}
              </ContextMenu.Item>
            </Show>
            <Show when={selectedNode()?.docType === SagDocumentType.FOLDER}>
              <ContextMenu.Item
                class="px-4 py-2 cursor-pointer hover:bg-gray-100"
                onSelect={() => {
                  handleContextMenu(MenuOption.AddFolder);
                }}
              >
                {MenuOption.AddFolder}
              </ContextMenu.Item>
            </Show>
          </ul>
        </ContextMenu.Content>
      </ContextMenu.Portal>
      {props.children}
    </ContextMenu>
  );
}

export function LeftSideBar() {
  const tree = createMutable(new FileTree());

  onMount(() => {
    eden.api.documents
      .get({
        $fetch: {
          mode: "cors",
          credentials: "include",
        },
      })
      .then((docs) => {
        batch(() => {
          docs.data.forEach((doc) => {
            tree.addDocument(doc);
          });
        });
      });
  });

  return (
    <>
      <FileContextMenu>
        <div class="w-1/4 max-h-screen overflow-auto">
          <For each={tree.getChildren()}>
            {(child) => (
              <div class="ml-4">
                <FileNode node={child} />
              </div>
            )}
          </For>
        </div>
      </FileContextMenu>
    </>
  );
}
