import { For, onMount, batch, createSignal, useContext, Show, Accessor, Suspense, Setter, JSXElement } from "solid-js";
import { eden } from "@client/api";
import { createMutable } from "solid-js/store";
import { EditorContext } from "@client/contexts/editor";
import { IEditorContext } from "@client/contexts/editor";
import { ContextMenu } from "@kobalte/core/context-menu";
import Swal from "sweetalert2";
import { Notification, Prompt } from "@client/common";
import styles from "@styles/LeftSideBar.module.css";

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

  constructor(params: {
    name: string;
    docType: SagDocumentType;
    path?: string;
    projectName?: string;
    orgName?: string;
    municipalityName?: string;
    parent?: TreeNode;
  }) {
    [this.name, this.setName] = createSignal(params.name);
    this.docType = params.docType;
    [this.path, this.setPath] = createSignal(params.path);
    this.isExpanded = false;
    this.projectName = params.projectName;
    this.orgName = params.orgName;
    this.municipalityName = params.municipalityName;
    this.children = createMutable([]);
    this.parent = params.parent;
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

  isFile() {
    return this.docType === SagDocumentType.FILE;
  }

  async createDocument(name: string, docType: SagDocumentType, path: string) {
    if (![SagDocumentType.FILE, SagDocumentType.FOLDER].includes(docType)) {
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
        new TreeNode({
          name: name,
          docType: docType,
          path: resp.data as string,
          projectName: this.projectName,
          orgName: this.orgName,
          municipalityName: this.municipalityName,
        }),
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

  async checkNewPath(name: string, isNew: boolean): Promise<boolean> {
    const response = await eden.api.check_path.post({
      projectName: this.projectName as string,
      organizationName: this.orgName as string,
      municipalityName: this.municipalityName as string,
      path: this.path() as string,
      possibleName: name,
      isNew: isNew,
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
    this.root = createMutable(new TreeNode({ name: "root", docType: SagDocumentType.FOLDER }));
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
      new TreeNode({
        name: doc.name,
        docType: SagDocumentType[doc.documentType.toUpperCase() as keyof typeof SagDocumentType],
        path: doc.documentPath,
        projectName: doc.projectName,
        orgName: doc.orgName,
        municipalityName: doc.municipalityName,
        parent: currentNode,
      }),
    );
  }

  addMunicipality(municipality: string) {
    if (this.root.findChild({ name: municipality }) == null) {
      this.root.addChild(
        new TreeNode({ name: municipality, docType: SagDocumentType.MUNICIPALITY, municipalityName: municipality }),
      );
    }
  }

  addOrg(org: string, municipality: string) {
    const municipalityNode = this.root.findChild({ name: municipality });
    if (municipalityNode?.findChild({ name: org }) == null) {
      municipalityNode?.addChild(
        new TreeNode({
          name: org,
          docType: SagDocumentType.ORG,
          municipalityName: municipalityNode.municipalityName,
          orgName: org,
        }),
      );
    }
  }

  addProject(project: string, org: string, municipality: string) {
    const municipalityNode = this.root.findChild({ name: municipality });
    const orgNode = municipalityNode?.findChild({ name: org });
    if (orgNode?.findChild({ name: project }) == null) {
      orgNode?.addChild(
        new TreeNode({
          name: project,
          docType: SagDocumentType.PROJECT,
          municipalityName: orgNode.municipalityName,
          orgName: orgNode.orgName,
          projectName: project,
        }),
      );
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
    <div class={styles["file-node"]}>
      <Suspense>
        <ContextMenu.Trigger
          disabled={
            ![SagDocumentType.FOLDER, SagDocumentType.FILE, SagDocumentType.PROJECT].includes(props.node.docType)
          }
        >
          <button
            class={styles["file-node-btn"]}
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
            <span class={styles["file-node-btn-icon"]}>{props.node.icon()}</span>
            <span>{props.node.name()}</span>
          </button>
        </ContextMenu.Trigger>
      </Suspense>

      <div
        //@ts-expect-error - original message: Variable 'expandDiv' is used before being assigned
        ref={expandDiv}
        class={styles["file-node-container"]}
      >
        <div class={styles["file-node-list"]}>
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
        const { value } = await Prompt.fire<string>({
          title: "Enter file name",
          input: "text",
          preConfirm: async (path) => {
            const node = selectedNode();
            if (await node?.checkNewPath(path, true)) {
              return path;
            }
            Swal.showValidationMessage("File or folder with this name already exists");
          },
          inputValidator: (input) => {
            console.log(input);
            if (!input.match("^[a-zA-Z0-9_ ]+$")) {
              return "Input must contain only letters, numbers, underscores and spaces";
            }
          },
        });
        if (value && value.length > 0) {
          const node = selectedNode();
          node?.createDocument(value as string, SagDocumentType.FILE, node?.path() as string);
        }

        break;
      }
      case MenuOption.AddFolder: {
        const { value } = await Prompt.fire<string>({
          title: "Enter folder name",
          input: "text",
          preConfirm: async (path) => {
            const node = selectedNode();
            if (await node?.checkNewPath(path, true)) {
              return path;
            }
            Swal.showValidationMessage("File or folder with this name already exists");
          },
          inputValidator: (input) => {
            console.log(input);
            if (!input.match("^[a-zA-Z0-9_ ]+$")) {
              return "Input must contain only letters, numbers, underscores and spaces";
            }
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
          preConfirm: async (path) => {
            const node = selectedNode();
            if (await node?.checkNewPath(path, false)) {
              return path;
            }
            Swal.showValidationMessage("File or folder with this name already exists");
          },
          inputValidator: (input) => {
            console.log(input);
            if (!input.match("^[a-zA-Z0-9_ ]+$")) {
              return "Input must contain only letters, numbers, underscores and spaces";
            }
          },
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
        <ContextMenu.Content class={styles["context-menu"]}>
          <Suspense>
            <ul class={styles["context-menu-ul"]}>
              <Show
                when={[SagDocumentType.FOLDER, SagDocumentType.FILE].includes(
                  selectedNode()?.docType as SagDocumentType,
                )}
              >
                <ContextMenu.Item
                  class={styles["context-menu-item"]}
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
                  class={styles["context-menu-item"]}
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
                  class={styles["context-menu-item"]}
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
                  class={styles["context-menu-item"]}
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
  //const tree = createMutable(new FileTree());
  const tree = new FileTree();

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

  //createEffect(() => {
  //  on(
  //    () => tree,
  //    () => console.log("tree updated"),
  //    { defer: true },
  //  );
  //});

  return (
    <>
      <FileContextMenu>
        <div class={styles["file-tree"]}>
          <For each={tree.getChildren()}>
            {(child) => (
              <div class={styles["file-tree-item"]}>
                <FileNode node={child} />
              </div>
            )}
          </For>
        </div>
      </FileContextMenu>
    </>
  );
}
