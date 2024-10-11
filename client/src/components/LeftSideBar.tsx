import {
  For,
  onMount,
  batch,
  createSignal,
  useContext,
  Show,
  Accessor,
  Suspense,
  Setter,
  JSXElement,
  onCleanup,
} from "solid-js";
import { eden } from "@client/api";
import { theme } from "@store/index";
import { file } from "bun";
import { createMutable } from "solid-js/store";
import { EditorContext } from "@client/routes/Editor";
import { IEditorContext } from "@client/types";
import { ContextMenu } from "@kobalte/core/context-menu";
import Swal from "sweetalert2";

// TODO: Swal: reuse configuration by creating your own Swal with Swal.mixin({...options})

export const Notification = Swal.mixin({
  toast: true,
  position: "top-right",
  timer: 1500,
  showConfirmButton: false,
});

export const Prompt = Swal.mixin({
  showCancelButton: false,
  buttonsStyling: false,
  showDenyButton: false,
  showCloseButton: true,
  inputAttributes: {
    autocomplete: "off",
  },
  customClass: {
    confirmButton:
      "bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline",
    popup: "bg-white shadow-xl rounded px-8 pt-6 pb-8 mb-4  flex flex-col gap gap-4",
  },
});

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

interface GetChildren {
  getChildren(): TreeNode[];
}

export class TreeNode implements GetChildren {
  children: TreeNode[];
  name: Accessor<string>;
  setName: Setter<string>;
  docType: SagDocumentType;
  path: Accessor<string | undefined>;
  setPath: Setter<string | undefined>;
  isExpanded: boolean;
  projectName: string | undefined;
  orgName: string | undefined;
  municipalityName: string | undefined;
  parent: TreeNode | undefined;

  constructor(
    name: string,
    docType: SagDocumentType,
    path?: string,
    projectName?: string,
    orgName?: string,
    municipalityName?: string,
    parent?: TreeNode,
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
    this.children.push(child);
  }

  getChildren() {
    return this.children;
  }

  findChild(params: { name: string } | { path: string }) {
    if ("name" in params) {
      return this.children.find((child) => child.name() === params.name);
    }

    if ([SagDocumentType.FOLDER, SagDocumentType.PROJECT].includes(this.docType)) {
      return this.children.find((child) => params.path.startsWith(child.path() as string)); // all children in a folder or project must have defined paths, otherwise wrong structure
    }

    console.error(`Cannot find child with path ${params.path} in ${this}`);
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

  async createDocument(name: string, docType: SagDocumentType, path: string) {
    if (docType !== SagDocumentType.FOLDER) {
      console.error("Cannot create document that is not a folder");
      return;
    }
    const resp = await eden.api.document.post({
      name: name,
      documentType: docType.toString().toLowerCase() as "file" | "folder",
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
    // TODO: add a notification when file is saved
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
    } else {
      Notification.fire({
        title: "File saved",
        icon: "success",
      });
    }
  }

  async renameDocument(newName: string) {
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
    if (this.path() === undefined) {
      console.error("Path is undefined");
      return;
    }
    this.setPath((this.path() as string).replace(this.path() as string, path));
    for (const child of this.children) {
      child.updatePath(path);
    }
  }

  async checkNewPath(name: string): Promise<boolean> {
    const response = await eden.api.check_path.get({
      projectName: this.projectName as string,
      organizationName: this.orgName as string,
      municipalityName: this.municipalityName as string,
      path: this.path() as string,
      possibleName: name,
      $fetch: {
        mode: "cors",
        credentials: "include",
      },
    });
    if (response.status === 200) {
      return true;
    }
    return false;
  }
}

class FileTree implements GetChildren {
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
    return this.root.children;
  }
}

function FileNode(props: { node: TreeNode }) {
  let expandDiv: HTMLDivElement;
  const { handleFileClick, setSelectedNode } = useContext(EditorContext) as IEditorContext;

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
        <ContextMenu.Trigger
          disabled={
            ![SagDocumentType.FOLDER, SagDocumentType.FILE, SagDocumentType.PROJECT].includes(props.node.docType)
          }
        >
          <button
            class="flex flex-row"
            onClick={async () => {
              if (
                [SagDocumentType.FOLDER, SagDocumentType.FILE, SagDocumentType.PROJECT].includes(props.node.docType)
              ) {
                setSelectedNode(props.node);
              }

              if (props.node.docType === SagDocumentType.FILE) {
                const content = await props.node.getContent();
                handleFileClick(content);
              } else {
                toggleExpanded();
              }
            }}
            onContextMenu={() => {
              if (
                [SagDocumentType.FOLDER, SagDocumentType.FILE, SagDocumentType.PROJECT].includes(props.node.docType)
              ) {
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
        //@ts-expect-error - original message: Variable 'expandDiv' is used before being assigned
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
  const { code, selectedNode } = useContext(EditorContext) as IEditorContext;

  async function handleContextMenu(action: MenuOption) {
    const node = selectedNode();
    switch (action) {
      case MenuOption.AddFile: {
        // TODO: check if a file doesn't exist and the name is valid
        const { value } = await Prompt.fire<string>({
          title: "Enter file name",
          input: "text",
        });
        if (value && value.length > 0) {
          const node = selectedNode();
          node?.createDocument(value as string, SagDocumentType.FILE, node?.path() as string);
        }

        break;
      }
      case MenuOption.AddFolder: {
        // TODO: check if a folder doesn't exist and the name is valid
        const { value } = await Prompt.fire<string>({
          title: "Enter folder name",
          input: "text",
          preConfirm: async (path) => {
            const node = selectedNode();
            if (await node?.checkNewPath(path)) {
              return path;
            }
            Swal.showValidationMessage("Path already exists");
          },
          inputValidator: (input) => {
            !input.match("^[a-zA-Z0-9_ ]+$") && "Input must contain only letters, numbers, underscores and spaces";
          },
        });
        if (value && value.length > 0) {
          const node = selectedNode();
          node?.createDocument(value as string, SagDocumentType.FOLDER, node?.path() as string);
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
        // TODO: check if the name is valid and it doesn't exist
        const { value } = await Prompt.fire<string>({
          title: "Enter new name",
          input: "text",
        });
        if (value && value.length > 0) {
          const node = selectedNode();
          node?.renameDocument(value);
        }
        break;
      }
    }
  }
  return (
    <ContextMenu>
      <ContextMenu.Portal>
        <ContextMenu.Content class="bg-white border border-gray-200 rounded shadow-lg">
          <Suspense>
            <ul class="py-1">
              <Show
                when={[SagDocumentType.FOLDER, SagDocumentType.FILE].includes(
                  selectedNode()?.docType as SagDocumentType,
                )}
              >
                <ContextMenu.Item
                  class="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  onSelect={async () => {
                    await handleContextMenu(MenuOption.Rename);
                  }}
                >
                  {MenuOption.Rename}
                </ContextMenu.Item>
              </Show>
              {
                //<Show when={selectedNode()?.docType === SagDocumentType.FILE}>
                //  <ContextMenu.Item
                //    class="px-4 py-2 cursor-pointer hover:bg-gray-100"
                //    onSelect={async () => {
                //      await handleContextMenu(MenuOption.Save);
                //    }}
                //  >
                //    {MenuOption.Save}
                //  </ContextMenu.Item>
                //</Show>
              }
              <Show
                when={[SagDocumentType.FOLDER, SagDocumentType.FILE].includes(
                  selectedNode()?.docType as SagDocumentType,
                )}
              >
                <ContextMenu.Item
                  class="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  onSelect={async () => {
                    await handleContextMenu(MenuOption.Delete);
                  }}
                >
                  {MenuOption.Delete}
                </ContextMenu.Item>
              </Show>
              <Show
                when={[SagDocumentType.FOLDER, SagDocumentType.PROJECT].includes(
                  selectedNode()?.docType as SagDocumentType,
                )}
              >
                <ContextMenu.Item
                  class="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  onSelect={async () => {
                    await handleContextMenu(MenuOption.AddFile);
                  }}
                >
                  {MenuOption.AddFile}
                </ContextMenu.Item>
              </Show>
              <Show
                when={[SagDocumentType.FOLDER, SagDocumentType.PROJECT].includes(
                  selectedNode()?.docType as SagDocumentType,
                )}
              >
                <ContextMenu.Item
                  class="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  onSelect={async () => {
                    await handleContextMenu(MenuOption.AddFolder);
                  }}
                >
                  {MenuOption.AddFolder}
                </ContextMenu.Item>
              </Show>
            </ul>
          </Suspense>
        </ContextMenu.Content>
      </ContextMenu.Portal>
      {props.children}
    </ContextMenu>
  );
}

export function LeftSideBar() {
  const tree = createMutable(new FileTree());
  const { setSelectedNode } = useContext(EditorContext) as IEditorContext;

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
          const docArray = docs.data as SagDocument[];
          docArray.forEach((doc: SagDocument) => {
            tree.addDocument(doc);
          });
        });
      });
  });

  // TODO: study this thing
  onCleanup(() => {
    setSelectedNode(null);
    tree.root.children = [];
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
