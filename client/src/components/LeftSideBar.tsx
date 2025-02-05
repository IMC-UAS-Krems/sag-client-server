import { For, onMount, batch, createSignal, useContext, Show, Accessor, Suspense, Setter, JSXElement } from "solid-js";
import { eden } from "@client/api";
import { createMutable } from "solid-js/store";
import { EditorContext } from "@client/contexts/editor";
import { IEditorContext } from "@client/contexts/editor";
import { ContextMenu } from "@kobalte/core/context-menu";
import Swal from "sweetalert2";
import { Notification, Prompt } from "@client/common";
import styles from "@styles/LeftSideBar.module.css";
import { RiArrowsArrowRightSLine, RiArrowsArrowDownSLine } from 'solid-icons/ri';

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

type expandState = JSON & {
  [key: string]: boolean;
};

const DEFAULT_IS_EXPANDED: boolean = false;
const DEFAULT_EXPAND_STATE: string = `{}`;

export class TreeNode implements GetChildren {
  children: TreeNode[];
  name: Accessor<string>;
  setName: Setter<string>;
  docType: SagDocumentType;
  /** can be undefined when `docType` is not `FILE` or `FOLDER` since other act as a path properties in the DB  */
  path: Accessor<string | undefined>;
  setPath: Setter<string | undefined>;
  /** can the undefinded when `docType` is `FILE` */
  isExpanded: Accessor<boolean | undefined>;
  setIsExpanded: Setter<boolean | undefined>;
  municipalityName: string;
  /** can be undefined when `docType` is `MUNICIPALITY` */
  projectName: string | undefined;
  /** can be undefined when `docType` is `MUNICIPALITY` or `PROJECT`  */
  orgName: string | undefined;
  parent: TreeNode | undefined;

  /**
   * @param params.name - name of the document that will be displayed
   * @param params.docType - type of the document
   * @param params.isExpanded - whether the document is expanded or not, can be undefined when `docType` is `FILE`
   * @param params.path - path of the document, can be undefined when `docType` is not `FILE` or `FOLDER`
   * @param params.projectName - name of the project, can be undefined when `docType` is `MUNICIPALITY`
   * @param params.orgName - name of the organization, can be undefined when `docType` is `MUNICIPALITY` or `PROJECT`
   * @param params.municipalityName - name of the municipality
   * @param params.parent - parent of the document
   */
  constructor(params: {
    name: string;
    docType: SagDocumentType;
    isExpanded?: boolean;
    path?: string;
    projectName?: string;
    orgName?: string;
    municipalityName: string;
    parent?: TreeNode;
  }) {
    [this.name, this.setName] = createSignal(params.name);
    this.docType = params.docType;
    [this.path, this.setPath] = createSignal(params.path);
    [this.isExpanded, this.setIsExpanded] = createSignal(params.isExpanded);
    this.projectName = params.projectName;
    this.orgName = params.orgName;
    this.municipalityName = params.municipalityName;
    this.children = createMutable([]);
    this.parent = params.parent;

    if (this.isExpanded()) this.saveExpandedState(this.isExpanded());
  }

  addChild(child: TreeNode) {
    this.children.push(child);
  }

  toggleExpanded() {
    this.setIsExpanded(!this.isExpanded());
    this.saveExpandedState(this.isExpanded());
  }

  collapse() {
    if (!this.isFile()) {
      this.setIsExpanded(false);
      this.saveExpandedState(this.isExpanded());

      for (const child of this.children) {
        child.collapse();
      }
    }
  }

  saveExpandedState(state: boolean | undefined) {
    if (state === undefined) return;

    const path = [];

    if (this.municipalityName) {
      path.push(this.municipalityName);
    }
    if (this.orgName) {
      path.push(this.orgName);
    }
    if (this.projectName) {
      path.push(this.projectName);
    }
    if (this.path()) {
      path.push(this.path());
    }

    const pathStr = path.join(".");
    const old_state: expandState = JSON.parse(localStorage.getItem("file_tree") || DEFAULT_EXPAND_STATE);

    if (state) old_state[pathStr] = state;
    else delete old_state[pathStr];

    localStorage.setItem("file_tree", JSON.stringify(old_state));
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
        return (
          <div class={styles["file-tree-icon-container"]}>
            {this.isExpanded() ? <RiArrowsArrowDownSLine /> : <RiArrowsArrowRightSLine />}{" "}
            {this.isExpanded() ? "📂" : "📁"}
          </div>
        );
      case SagDocumentType.MUNICIPALITY:
        return(
          <div class={styles["file-tree-icon-container"]}>
            {this.isExpanded() ? <RiArrowsArrowDownSLine /> : <RiArrowsArrowRightSLine />}{" "}
            🏠
          </div>
        )
      case SagDocumentType.ORG:
        return(
          <div class={styles["file-tree-icon-container"]}>
            {this.isExpanded() ? <RiArrowsArrowDownSLine /> : <RiArrowsArrowRightSLine />}{" "}
            🏢
          </div>
        )
      case SagDocumentType.PROJECT:
        return(
          <div class={styles["file-tree-icon-container"]}>
            {this.isExpanded() ? <RiArrowsArrowDownSLine /> : <RiArrowsArrowRightSLine />}{" "}
            🏗️
          </div>
        )
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
      path: path || "", // path can be empty resulting in nil or null
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
          isExpanded: true,
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
    this.collapse();

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
      path: (this.path() as string) || "", // path can be empty resulting in nil or null
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
    // @ts-expect-error: this is a special node that does not renderen thus can have many undefined properties
    this.root = createMutable(new TreeNode({ name: "root", docType: SagDocumentType.FOLDER }));
  }

  addDocument(doc: SagDocument, old_state: expandState) {
    const pathSplit = doc.documentPath.lastIndexOf(".");
    const path = pathSplit === -1 ? doc.documentPath : doc.documentPath.slice(0, pathSplit);

    this.addMunicipality(doc.municipalityName, old_state);
    this.addOrg(doc.orgName, doc.municipalityName, old_state);
    this.addProject(doc.projectName, doc.orgName, doc.municipalityName, old_state);

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
        isExpanded: this.parse_old_state(
          old_state,
          `${doc.municipalityName}.${doc.orgName}.${doc.projectName}.${doc.documentPath}`,
        ),
      }),
    );
  }

  parse_old_state(old_state: expandState, path: string): boolean | undefined {
    if (old_state[path] !== undefined) {
      return old_state[path];
    }
    return DEFAULT_IS_EXPANDED;
  }

  addMunicipality(municipality: string, old_state: expandState) {
    if (this.root.findChild({ name: municipality }) == null) {
      this.root.addChild(
        new TreeNode({
          name: municipality,
          docType: SagDocumentType.MUNICIPALITY,
          municipalityName: municipality,
          isExpanded: this.parse_old_state(old_state, municipality),
        }),
      );
    }
  }

  addOrg(org: string, municipality: string, old_state: expandState) {
    const municipalityNode = this.root.findChild({ name: municipality });
    if (municipalityNode?.findChild({ name: org }) == null) {
      municipalityNode?.addChild(
        new TreeNode({
          name: org,
          docType: SagDocumentType.ORG,
          municipalityName: municipalityNode.municipalityName,
          orgName: org,
          isExpanded: this.parse_old_state(old_state, `${municipality}.${org}`),
        }),
      );
    }
  }

  addProject(project: string, org: string, municipality: string, old_state: expandState) {
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
          isExpanded: this.parse_old_state(old_state, `${municipality}.${org}.${project}`),
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

  const { handleFileClick, setSelectedNode, selectedNode, navigateToFile } = useContext(
    EditorContext,
  ) as IEditorContext;

  function toggleExpanded() {
    if (!props.node.isExpanded()) {
      expandDiv.classList.add(styles["file-node-container-expanded"]);
      expandDiv.classList.remove(styles["file-node-container-collapsed"]);
    } else {
      expandDiv.classList.remove(styles["file-node-container-expanded"]);
      expandDiv.classList.add(styles["file-node-container-collapsed"]);
    }
    props.node.toggleExpanded();
    if (!props.node.isExpanded()) {
      for (const child of props.node.getChildren()) {
        child.collapse();
      }
    }
    console.log(props.node);
  }

  const isSelected = () => {
    const currentNode = selectedNode();
    if (!currentNode) return false;

    const selectedContext = {
      path: currentNode.path(),
      municipality: currentNode.municipalityName,
      organization: currentNode.orgName,
      project: currentNode.projectName,
      file_type: currentNode.docType,
    };

    const nodeContext = {
      path: props.node.path(),
      municipality: props.node.municipalityName,
      organization: props.node.orgName,
      project: props.node.projectName,
      file_type: props.node.docType,
    };

    return (
      selectedContext.path === nodeContext.path &&
      selectedContext.municipality === nodeContext.municipality &&
      selectedContext.organization === nodeContext.organization &&
      selectedContext.project === nodeContext.project &&
      selectedContext.file_type === SagDocumentType.FILE &&
      nodeContext.file_type === SagDocumentType.FILE
    );
  };

  return (
    <div class={styles["file-node"]}>
      <Suspense>
        <ContextMenu.Trigger
          disabled={
            ![SagDocumentType.FOLDER, SagDocumentType.FILE, SagDocumentType.PROJECT].includes(props.node.docType)
          }
        >
          <button
            class={`${styles["file-node-btn"]} ${isSelected() ? styles["file-node-btn-selected"] : ""}`}
            onClick={async () => {
              if (props.node.docType === SagDocumentType.FILE) {
                navigateToFile(props.node);
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
        class={styles["file-node-container"].concat(
          " ",
          props.node.isExpanded() ? styles["file-node-container-expanded"] : styles["file-node-container-collapsed"],
        )}
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
          const old_state: expandState = JSON.parse(localStorage.getItem("file_tree") || DEFAULT_EXPAND_STATE);
          localStorage.removeItem("file_tree");
          const docArray = docs.data as SagDocument[];
          docArray.forEach((doc: SagDocument) => {
            tree.addDocument(doc, old_state);
          });
        });
      });
  });

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
