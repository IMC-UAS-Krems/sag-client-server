import { For, onMount, batch, createSignal, useContext, Show, Accessor, Suspense, Setter, JSXElement } from "solid-js";
import { eden } from "@client/api/index.ts";
import { createMutable } from "solid-js/store";
import { EditorContext } from "@client/contexts/editor.tsx";
import { IEditorContext } from "@client/contexts/editor.tsx";
import { RiArrowsArrowRightSLine, RiArrowsArrowDownSLine } from "solid-icons/ri";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuPortal,
  // ContextMenuGroup,
  // ContextMenuGroupLabel,
} from "@client/components/ui/context-menu.tsx";
import { Skeleton } from "@client/components/ui/skeleton.tsx";
import QuickDialog from "@client/components/QuickDialog.tsx";
import EditorContextDialog from "@client/components/EditorContextDialog.tsx";
import { showToast } from "@client/components/ui/toast.tsx";

export enum SagDocumentType {
  FILE = "FILE",
  FOLDER = "FOLDER",
  MUNICIPALITY = "MUNICIPALITY",
  ORG = "ORG",
  PROJECT = "PROJECT",
}

export enum MenuOption {
  Save = "Save",
  Delete = "Delete",
  Rename = "Rename",
  AddFile = "Add File",
  AddFileFromTemplate = "Add File From Template",
  AddFolder = "Add Folder",
}

type SagDocument = {
  name: string;
  municipalityName: string;
  orgName: string;
  projectName: string;
  documentType: string;
  documentPath: string;
  isTemplate: boolean;
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
  isTemplate: boolean | undefined;
  editorContext?: IEditorContext; // Injected editor context

  /**
   * @param params.name - name of the document that will be displayed
   * @param params.docType - type of the document
   * @param params.isExpanded - whether the document is expanded or not, can be undefined when `docType` is `FILE`
   * @param params.path - path of the document, can be undefined when `docType` is not `FILE` or `FOLDER`
   * @param params.projectName - name of the project, can be undefined when `docType` is `MUNICIPALITY`
   * @param params.orgName - name of the organization, can be undefined when `docType` is `MUNICIPALITY` or `PROJECT`
   * @param params.municipalityName - name of the municipality
   * @param params.parent - parent of the document
   * @param params.isTemplate - whether the document is a template or not
   */
  constructor(
    params: {
      name: string;
      docType: SagDocumentType;
      isExpanded?: boolean;
      path?: string;
      projectName?: string;
      orgName?: string;
      municipalityName: string;
      parent?: TreeNode;
      isTemplate?: boolean;
    },
    editorContext?: IEditorContext,
  ) {
    [this.name, this.setName] = createSignal(params.name);
    this.docType = params.docType;
    [this.path, this.setPath] = createSignal(params.path);
    [this.isExpanded, this.setIsExpanded] = createSignal(params.isExpanded);
    this.projectName = params.projectName;
    this.orgName = params.orgName;
    this.municipalityName = params.municipalityName;
    this.children = createMutable([]);
    this.parent = params.parent;
    this.isTemplate = params.isTemplate;
    this.editorContext = editorContext;

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

    if ([SagDocumentType.FOLDER, SagDocumentType.PROJECT, SagDocumentType.ORG].includes(this.docType)) {
      return this.children.find((child) => params.path.startsWith(child.path() as string)); // all children in a folder or project must have defined paths, otherwise wrong structure
    }

    console.error(`Cannot find child with path ${params.path} in ${this}`);
    console.error(this);
    console.error(this.children);
    console.error(this.children.map((child) => child.path()));
  }

  getOrganisationNode() {
    // To battle possible cycles
    let iterCount = 0;
    const maxIter = 100;
    let orgNode = this as TreeNode; // Init the node to the current node

    while (orgNode?.parent?.docType !== SagDocumentType.ORG && iterCount < maxIter) {
      const nodeParent = orgNode?.parent;
      if (!(nodeParent instanceof TreeNode)) {
        console.error("Parent node is not a TreeNode for node: ", nodeParent);
        return null;
      }
      orgNode = nodeParent;
      iterCount++;
    }
    return orgNode?.parent;
  }

  getPathList() {
    const path = [];

    // To battle possible cycles
    let iterCount = 0;
    const maxIter = 100;
    let currentNode = this as TreeNode;

    while (currentNode.parent instanceof TreeNode && iterCount < maxIter) {
      path.unshift(currentNode.name());
      // console.log("Parent is: ", currentNode.parent);
      currentNode = currentNode.parent;
      iterCount++;
    }
    path.unshift(currentNode.name());
    path.unshift(currentNode.municipalityName);

    return path;
  }

  icon() {
    switch (this.docType) {
      case SagDocumentType.FILE:
        return "📄";
      case SagDocumentType.FOLDER:
        return (
          <div class="flex items-center gap-2 text-primary">
            {this.isExpanded() ? (
              <RiArrowsArrowDownSLine class="fill-blue!" />
            ) : (
              <RiArrowsArrowRightSLine class="fill-blue!" />
            )}{" "}
            {this.isTemplate && this.path() === "templates" ? "📚" : this.isExpanded() ? "📂" : "📁"}
          </div>
        );
      case SagDocumentType.MUNICIPALITY:
        return (
          <div class="flex items-center gap-2 text-primary">
            {this.isExpanded() ? <RiArrowsArrowDownSLine /> : <RiArrowsArrowRightSLine />} 🏠
          </div>
        );
      case SagDocumentType.ORG:
        return (
          <div class="flex items-center gap-2 text-primary">
            {this.isExpanded() ? <RiArrowsArrowDownSLine /> : <RiArrowsArrowRightSLine />} 🏢
          </div>
        );
      case SagDocumentType.PROJECT:
        return (
          <div class="flex items-center gap-2 text-primary">
            {this.isExpanded() ? <RiArrowsArrowDownSLine /> : <RiArrowsArrowRightSLine />} 🏗️
          </div>
        );
    }
  }

  isFile() {
    return this.docType === SagDocumentType.FILE;
  }

  async createDocument(name: string, docType: SagDocumentType, path: string, content?: string) {
    if (![SagDocumentType.FILE, SagDocumentType.FOLDER].includes(docType)) {
      console.error("Cannot create document that is not a folder or a file");
      return;
    }
    // console.log("Sending request to create document with content: ", content);
    const resp = await eden.api.document.post({
      name: name,
      documentType: docType.toString().toLowerCase() as "file" | "folder",
      path: path || "", // path can be empty resulting in nil or null
      organizationName: this.orgName as string,
      municipalityName: this.municipalityName as string,
      ...(content && { content }), // Conditionally include content if it is defined
      ...(this.projectName && { projectName: this.projectName as string }),
      isTemplate: this.isTemplate, // If the parent node is template, then child shall be template as well
      $fetch: {
        mode: "cors",
        credentials: "include",
      },
    });

    if (resp.status === 200) {
      const newNode = new TreeNode({
        name: name,
        docType: docType,
        path: resp.data as string,
        projectName: this.projectName,
        orgName: this.orgName,
        municipalityName: this.municipalityName,
        isExpanded: true,
        parent: this,
        isTemplate: this.isTemplate,
      });
      this.addChild(newNode);
      showToast({
        title: "Success",
        description: "File created successfully",
        variant: "success",
      });
      return newNode;
    } else {
      if (resp.status === 409) {
        showToast({
          title: "Error",
          description: "File with name already exists",
          variant: "error",
        });
      } else if (resp.status === 403) {
        showToast({
          title: "Error",
          description: "You do not have permission to create a file in this folder",
          variant: "error",
        });
      } else {
        showToast({
          title: "Error",
          description: "Something went wrong when creating the file, try again later",
          variant: "error",
        });
      }
    }
  }

  async deleteDocument() {
    if (![SagDocumentType.FILE, SagDocumentType.FOLDER].includes(this.docType)) {
      console.error("Cannot delete document that is not a folder or a file");
      return;
    }
    // console.log("Trying to delete document: ", this);
    const requestBody = {
      organizationName: this.orgName as string,
      municipalityName: this.municipalityName as string,
      path: this.path() as string,
      ...(this.projectName ? { projectName: this.projectName as string } : {}),
    };
    // console.log("Making call to delete with: ", requestBody);
    const resp = await eden.api.document.delete({
      ...requestBody,
      $fetch: {
        mode: "cors",
        credentials: "include",
      },
    });

    if (resp.status === 200) {
      this.collapse();
      const index = this.parent?.children.findIndex((child) => child.name() === this.name());
      if (index !== undefined) {
        this.parent?.children.splice(index, 1);
      }
      if (this.parent instanceof TreeNode && this.editorContext) {
        this.editorContext.setSelectedNode(this.parent); // This could also be set to `null`, but needs extra care with the breadcrumbs
        this.editorContext.setCode("");
      }

      showToast({
        title: "Success",
        description: "File deleted successfully",
        variant: "success",
      });
    } else {
      showToast({
        title: "Error",
        description: "Couldn't delete file",
        variant: "error",
      });
    }
  }

  async getContent(): Promise<string> {
    const queryBody = {
      organizationName: this.orgName as string,
      municipalityName: this.municipalityName as string,
      path: this.path() as string,
      ...(this.projectName ? { projectName: this.projectName as string } : {}),
    };
    const resp = await eden.api.document_content.get({
      $query: queryBody,
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
    if (this.docType !== SagDocumentType.FILE) {
      console.error("Cannot save content for a document that is not a file");
      return false;
    }
    const requestBody = {
      organizationName: this.orgName as string,
      municipalityName: this.municipalityName as string,
      path: this.path() as string,
      content: content,
      ...(this.projectName ? { projectName: this.projectName as string } : {}),
    };
    const resp = await eden.api.document_content.put({
      ...requestBody,
      $fetch: {
        mode: "cors",
        credentials: "include",
      },
    });
    if (resp.status !== 200) {
      console.error("Error saving content");
      showToast({
        title: "Error",
        description: "Couldn't save file, try again later",
        variant: "error",
      });
      return false;
    } else {
      showToast({
        title: "Success",
        description: "File saved successfully",
        variant: "success",
      });
      return true;
    }
  }

  async renameDocument(newName: string) {
    if (newName) {
      const requestBody = {
        newName: newName,
        organizationName: this.orgName as string,
        municipalityName: this.municipalityName as string,
        path: this.path() as string,
        ...(this.projectName ? { projectName: this.projectName as string } : {}),
      };
      const resp = await eden.api.document.put({
        ...requestBody,
        $fetch: {
          mode: "cors",
          credentials: "include",
        },
      });

      if (resp.status === 200) {
        this.setName(newName);
        this.updatePath(resp.data as string);
        showToast({
          title: "Success",
          description: "File renamed successfully",
          variant: "success",
        });
      } else {
        if (resp.status === 409) {
          showToast({
            title: "Error",
            description: "File with name already exists",
            variant: "error",
          });
        } else {
          showToast({
            title: "Error",
            description: "Couldn't rename file, try again later",
            variant: "error",
          });
        }
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
    const requestBody = {
      organizationName: this.orgName as string,
      municipalityName: this.municipalityName as string,
      path: (this.path() as string) || "", // path can be empty resulting in nil or null
      possibleName: name,
      isNew: isNew,
      ...(this.projectName ? { projectName: this.projectName as string } : {}),
    };
    const response = await eden.api.check_path.post({
      ...requestBody,
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
  editorContext: IEditorContext;

  constructor(editorContext: IEditorContext) {
    // @ts-expect-error: this is a special node that does not renderen thus can have many undefined properties
    this.root = createMutable(new TreeNode({ name: "root", docType: SagDocumentType.FOLDER }));
    this.editorContext = editorContext;
  }

  addDocument(doc: SagDocument, old_state: expandState) {
    // We can simply add municipality and org nodes since they are always present (not the case for Projects - Templates)
    this.addMunicipality(doc.municipalityName, old_state);
    this.addOrg(doc.orgName, doc.municipalityName, old_state);

    let currentNode: TreeNode | undefined;

    // If there's a project name make currentNode the project node and add project node
    if (doc.projectName) {
      this.addProject(doc.projectName, doc.orgName, doc.municipalityName, old_state);
      currentNode = this.root
        .findChild({ name: doc.municipalityName })
        ?.findChild({ name: doc.orgName })
        ?.findChild({ name: doc.projectName });
    } else {
      // If there is no project name, make currentNode the org node
      currentNode = this.root.findChild({ name: doc.municipalityName })?.findChild({ name: doc.orgName });
    }

    // If the current node is not found, log an error and return
    if (!currentNode) {
      console.error("Parent node not found for document:", doc.name);
      return;
    }

    // getting the path
    const pathSplit = doc.documentPath.lastIndexOf(".");
    const path = pathSplit === -1 ? doc.documentPath : doc.documentPath.slice(0, pathSplit);

    // Loop through the path and add the document to the correct node
    // - once we reach the end of the path, add the document (with each iteration move currentNode pointer)
    for (let i = 1; i < doc.documentPath.split(".").length; i++) {
      currentNode = currentNode?.findChild({ path: path });
    }

    currentNode?.addChild(
      new TreeNode(
        {
          name: doc.name,
          docType: SagDocumentType[doc.documentType.toUpperCase() as keyof typeof SagDocumentType],
          path: doc.documentPath,
          projectName: doc.projectName,
          orgName: doc.orgName,
          municipalityName: doc.municipalityName,
          parent: currentNode,
          isExpanded: this.parse_old_state(old_state, this.getStateKey(doc)),
          isTemplate: doc.isTemplate,
        },
        this.editorContext,
      ),
    );
  }

  getStateKey(doc: SagDocument): string {
    const parts = [doc.municipalityName, doc.orgName];
    if (!doc.isTemplate && doc.projectName) {
      parts.push(doc.projectName);
    }
    parts.push(doc.documentPath);
    return parts.join(".");
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
        new TreeNode(
          {
            name: municipality,
            docType: SagDocumentType.MUNICIPALITY,
            municipalityName: municipality,
            isExpanded: this.parse_old_state(old_state, municipality),
          },
          this.editorContext,
        ),
      );
    }
  }

  addOrg(org: string, municipality: string, old_state: expandState) {
    const municipalityNode = this.root.findChild({ name: municipality });
    if (municipalityNode?.findChild({ name: org }) == null) {
      municipalityNode?.addChild(
        new TreeNode(
          {
            name: org,
            docType: SagDocumentType.ORG,
            municipalityName: municipalityNode.municipalityName,
            orgName: org,
            isExpanded: this.parse_old_state(old_state, `${municipality}.${org}`),
          },
          this.editorContext,
        ),
      );
    }
  }

  addProject(project: string, org: string, municipality: string, old_state: expandState) {
    const municipalityNode = this.root.findChild({ name: municipality });
    const orgNode = municipalityNode?.findChild({ name: org });
    if (orgNode?.findChild({ name: project }) == null) {
      orgNode?.addChild(
        new TreeNode(
          {
            name: project,
            docType: SagDocumentType.PROJECT,
            municipalityName: orgNode.municipalityName,
            orgName: orgNode.orgName,
            projectName: project,
            parent: orgNode,
            isExpanded: this.parse_old_state(old_state, `${municipality}.${org}.${project}`),
          },
          this.editorContext,
        ),
      );
    }
  }

  getChildren() {
    return this.root.children;
  }
}

function FileNode(props: { node: TreeNode }) {
  let expandDiv: HTMLDivElement;

  const { selectedNode, navigateToFile } = useContext(EditorContext) as IEditorContext;

  function toggleExpanded() {
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
      selectedContext.project === nodeContext.project
    );
  };

  return (
    <div class="flex flex-col">
      <Suspense>
        <ContextMenuTrigger
          disabled={
            ![SagDocumentType.FOLDER, SagDocumentType.FILE, SagDocumentType.PROJECT].includes(props.node.docType)
          }
        >
          <button
            class={`flex b-0 bg-none cursor-pointer ${isSelected() && "font-bold"}`}
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
                // setSelectedNode(props.node);
                navigateToFile(props.node);
              }
            }}
          >
            <span class={`mr-2 ${props.node.isFile() && "pl-6"}`}>{props.node.icon()}</span>
            <span class="text-primary whitespace-nowrap overflow-hidden text-ellipsis">{props.node.name()}</span>
          </button>
        </ContextMenuTrigger>
      </Suspense>

      <div
        //@ts-expect-error - original message: Variable 'expandDiv' is used before being assigned
        ref={expandDiv}
        class={`
          transition-all
          duration-500
          overflow-hidden
          grid
          ${props.node.isExpanded() ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}
        `}
      >
        <div class="ml-6 min-h-0">
          <For each={props.node.getChildren()}>{(child) => <FileNode node={child} />}</For>
        </div>
      </div>
    </div>
  );
}

function FileContextMenu(props: { children: JSXElement }) {
  const editorContext = useContext(EditorContext);
  if (!editorContext) {
    return <>{props.children}</>;
  }
  const { code, selectedNode, navigateToFile } = useContext(EditorContext) as IEditorContext;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = createSignal(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = createSignal(false);
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = createSignal(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = createSignal(false);
  const [isAddFileFromTemplateDialogOpen, setIsAddFileFromTemplateDialogOpen] = createSignal(false);

  async function handleContextMenu(action: MenuOption) {
    const node = selectedNode();
    if (!node) return;

    switch (action) {
      case MenuOption.AddFile: {
        setIsNewFileDialogOpen(true);
        break;
      }
      case MenuOption.AddFileFromTemplate: {
        setIsAddFileFromTemplateDialogOpen(true);
        break;
      }
      case MenuOption.AddFolder: {
        setIsNewFolderDialogOpen(true);
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
        setIsRenameDialogOpen(true);
        break;
      }
    }
  }
  return (
    <>
      <div>
        <ContextMenu>
          <ContextMenuPortal>
            <ContextMenuContent>
              <Suspense fallback={<Skeleton height={20} class="w-full" />}>
                <Show
                  when={
                    [SagDocumentType.FOLDER, SagDocumentType.FILE].includes(
                      selectedNode()?.docType as SagDocumentType,
                    ) &&
                    !(
                      selectedNode()?.isTemplate &&
                      selectedNode()?.docType === SagDocumentType.FOLDER &&
                      selectedNode()?.path() === "templates"
                    )
                  }
                >
                  <ContextMenuItem
                    onSelect={async () => {
                      await handleContextMenu(MenuOption.Rename);
                    }}
                  >
                    {MenuOption.Rename}
                  </ContextMenuItem>
                </Show>
                <Show
                  when={
                    [SagDocumentType.FOLDER, SagDocumentType.FILE].includes(
                      selectedNode()?.docType as SagDocumentType,
                    ) &&
                    !(
                      selectedNode()?.isTemplate &&
                      selectedNode()?.docType === SagDocumentType.FOLDER &&
                      selectedNode()?.path() === "templates"
                    )
                  }
                >
                  <ContextMenuItem onSelect={() => setIsDeleteDialogOpen(true)}>Delete</ContextMenuItem>
                </Show>
                <Show
                  when={[SagDocumentType.FOLDER, SagDocumentType.PROJECT].includes(
                    selectedNode()?.docType as SagDocumentType,
                  )}
                >
                  <ContextMenuItem
                    onSelect={async () => {
                      await handleContextMenu(MenuOption.AddFile);
                    }}
                  >
                    {MenuOption.AddFile}
                  </ContextMenuItem>
                </Show>
                <Show
                  when={
                    [SagDocumentType.FOLDER, SagDocumentType.PROJECT].includes(
                      selectedNode()?.docType as SagDocumentType,
                    ) && !(selectedNode()?.isTemplate && selectedNode()?.docType === SagDocumentType.FOLDER)
                  }
                >
                  <ContextMenuItem onSelect={() => handleContextMenu(MenuOption.AddFileFromTemplate)}>
                    {MenuOption.AddFileFromTemplate}
                  </ContextMenuItem>
                </Show>
                <Show
                  when={[SagDocumentType.FOLDER, SagDocumentType.PROJECT].includes(
                    selectedNode()?.docType as SagDocumentType,
                  )}
                >
                  <ContextMenuItem
                    onSelect={async () => {
                      await handleContextMenu(MenuOption.AddFolder);
                    }}
                  >
                    {MenuOption.AddFolder}
                  </ContextMenuItem>
                </Show>
              </Suspense>
            </ContextMenuContent>
          </ContextMenuPortal>
          {props.children}
        </ContextMenu>
      </div>
      {/* CONTEXT MENU DIALOGS */}
      {/* - Delete dialog */}
      <QuickDialog
        variant="destructive"
        handler={() => handleContextMenu(MenuOption.Delete)}
        triggerTitle={MenuOption.Delete}
        buttonText="Delete"
        title="Delete File"
        description={"Are you sure you want to delete"}
        subject={selectedNode()?.name() || "this file"}
        open={isDeleteDialogOpen}
        setOpen={setIsDeleteDialogOpen}
        modal={true}
      />
      {/* - Rename dialog */}
      <EditorContextDialog
        variant="confirm"
        menuOption={MenuOption.Rename}
        buttonText="Rename"
        title="Rename File"
        description="Enter the new name for the file"
        open={isRenameDialogOpen}
        setOpen={setIsRenameDialogOpen}
        node={selectedNode()}
      />
      {/* - New file dialog */}
      <EditorContextDialog
        variant="confirm"
        menuOption={MenuOption.AddFile}
        buttonText="Create File"
        title="File Name"
        description="Please name the new file."
        open={isNewFileDialogOpen}
        setOpen={setIsNewFileDialogOpen}
        node={selectedNode()}
        navigateToFile={navigateToFile}
      />
      {/* - New folder dialog */}
      <EditorContextDialog
        variant="confirm"
        menuOption={MenuOption.AddFolder}
        buttonText="Create Folder"
        title="Folder Name"
        description="Please name the new folder."
        open={isNewFolderDialogOpen}
        setOpen={setIsNewFolderDialogOpen}
        node={selectedNode()}
        navigateToFile={navigateToFile}
      />
      {/* - New file from template */}
      <EditorContextDialog
        variant="confirm"
        menuOption={MenuOption.AddFileFromTemplate}
        buttonText="Create File"
        title="New file from template"
        description="Please select one of your organisation's templates and give a name to the file created from it."
        open={isAddFileFromTemplateDialogOpen}
        setOpen={setIsAddFileFromTemplateDialogOpen}
        node={selectedNode()}
        navigateToFile={navigateToFile}
      />
    </>
  );
}

export function LeftSideBar() {
  const editorContext = useContext(EditorContext) as IEditorContext;
  const tree = new FileTree(editorContext);

  onMount(() => {
    eden.api.documents
      .get({
        $fetch: {
          mode: "cors",
          credentials: "include",
        },
      })
      .then((docs: { data: SagDocument[] }) => {
        batch(() => {
          const old_state: expandState = JSON.parse(localStorage.getItem("file_tree") || DEFAULT_EXPAND_STATE);
          localStorage.removeItem("file_tree");
          const docArray = docs.data;
          docArray.forEach((doc: SagDocument) => {
            tree.addDocument(doc, old_state);
          });
        });
      });
  });

  return (
    <div class="flex-[1] h-full p-2.5 bg-accent/50 border-1 border-accent-foreground/20 w-0 min-w-0">
      {/* The w-0 min-w-0 forces this container to respect flex sizing strictly */}
      <div class="overflow-x-auto overflow-y-auto max-h-full w-full">
        <FileContextMenu>
          <div class="min-w-max mb-4">
            {/* min-w-max ensures the content takes as much width as it needs */}
            <For each={tree.getChildren()}>
              {(child) => (
                <div class={`${child.docType !== SagDocumentType.MUNICIPALITY && "ml-4"}`}>
                  <FileNode node={child} />
                </div>
              )}
            </For>
          </div>
        </FileContextMenu>
      </div>
    </div>
  );
}
