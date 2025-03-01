import { For, onMount, batch, createSignal, useContext, Show, Accessor, Suspense, Setter, JSXElement } from "solid-js";
import { eden } from "@client/api/index.ts";
import { createMutable } from "solid-js/store";
import { EditorContext } from "@client/contexts/editor.tsx";
import { IEditorContext } from "@client/contexts/editor.tsx";
import { ContextMenu } from "@kobalte/core/context-menu";
import Swal from "sweetalert2";
import { Notification, Prompt } from "@client/common.ts";
import styles from "@styles/LeftSideBar.module.css";
import { RiArrowsArrowRightSLine, RiArrowsArrowDownSLine } from "solid-icons/ri";

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
        // Notification.fire({
        //   title: "Error in finding templates",
        //   icon: "error",
        // });
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
          <div class={styles["file-tree-icon-container"]}>
            {this.isExpanded() ? <RiArrowsArrowDownSLine /> : <RiArrowsArrowRightSLine />}{" "}
            {this.isTemplate && this.path() === "templates" ? "📚" : this.isExpanded() ? "📂" : "📁"}
          </div>
        );
      case SagDocumentType.MUNICIPALITY:
        return (
          <div class={styles["file-tree-icon-container"]}>
            {this.isExpanded() ? <RiArrowsArrowDownSLine /> : <RiArrowsArrowRightSLine />} 🏠
          </div>
        );
      case SagDocumentType.ORG:
        return (
          <div class={styles["file-tree-icon-container"]}>
            {this.isExpanded() ? <RiArrowsArrowDownSLine /> : <RiArrowsArrowRightSLine />} 🏢
          </div>
        );
      case SagDocumentType.PROJECT:
        return (
          <div class={styles["file-tree-icon-container"]}>
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
      return newNode;
    }
  }

  async deleteDocument() {
    if (![SagDocumentType.FILE, SagDocumentType.FOLDER].includes(this.docType)) {
      console.error("Cannot delete document that is not a folder or a file");
      return;
    }

    console.log("Trying to delete document: ", this);

    const requestBody = {
      organizationName: this.orgName as string,
      municipalityName: this.municipalityName as string,
      path: this.path() as string,
      ...(this.projectName ? { projectName: this.projectName as string } : {}),
    };
    console.log("Making call to delete with: ", requestBody);
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

      Notification.fire({
        title: "File deleted successfully",
        icon: "success",
      });
    } else {
      Notification.fire({
        title: "Error deleting file",
        icon: "error",
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
      Notification.fire({
        title: "Error saving content",
        icon: "error",
      });
      return false;
    } else {
      Notification.fire({
        title: "File saved",
        icon: "success",
      });
      return true;
    }
  }

  async saveFileAsTemplate(content: string): Promise<TreeNode | null> {
    // Traverse the tree to find the org node
    const orgNode = this.getOrganisationNode();
    // Select the child node that has `docType` folder and `isTemplate` true
    const templateNode = orgNode?.children.find(
      (child) => child.docType === SagDocumentType.FOLDER && child.isTemplate,
    );

    if (!templateNode) {
      Notification.fire({
        title: "No templates folder found for the organisation",
        icon: "error",
      });
      return null;
    }

    // Now we can get the children of the template node and their names
    const templates = templateNode.children.map((child) => child.name());

    // First get the name for the template via swal prompt
    const { value } = await Prompt.fire<string>({
      title: "Enter template name",
      input: "text",
      preConfirm: async (name) => {
        if (templates.includes(name)) {
          Swal.showValidationMessage("A template with this name already exists");
          return false; // Prevent the alert from closing
        }
      },
      inputValidator: (input) => {
        console.log(input);
        if (!input.match("^[a-zA-Z0-9_ ]+$")) {
          return "Input must contain only letters, numbers, underscores and spaces";
        }
      },
    });

    if (!value || value.length <= 0) return null;

    const resp = await eden.api.save_as_template.post({
      organizationName: this.orgName as string,
      name: value as string,
      content: content,
      $fetch: {
        mode: "cors",
        credentials: "include",
      },
    });
    if (resp.status !== 201) {
      console.error("Error saving content as template");
      Notification.fire({
        title: resp.data as string,
        icon: "error",
      });
      return null;
    } else {
      Notification.fire({
        title: "File saved as template",
        icon: "success",
      });
      console.log("Response for creating the new node: ", resp.data);
      const newNode = new TreeNode(
        {
          name: value as string,
          docType: SagDocumentType.FILE,
          path: resp.data as string,
          projectName: undefined, // There is no project name on purpose
          orgName: this.orgName,
          municipalityName: this.municipalityName,
          isExpanded: true,
          isTemplate: true,
          parent: templateNode,
        },
        this.editorContext,
      );
      console.log("New node created: ", newNode);

      templateNode?.addChild(newNode);
      // console.log("New node added to the org node's template folder: ", templateNode);
      return newNode;
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
        Notification.fire({
          title: "File renamed successfully",
          icon: "success",
        });
      } else {
        Notification.fire({
          title: "Error renaming file",
          icon: "error",
        });
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
          isExpanded: this.parse_old_state(
            old_state,
            `${doc.municipalityName}.${doc.orgName}.${doc.projectName}.${doc.documentPath}`,
          ),
          isTemplate: doc.isTemplate,
        },
        this.editorContext,
      ),
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
      selectedContext.project === nodeContext.project
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
                // setSelectedNode(props.node);
                navigateToFile(props.node);
              }
            }}
          >
            <span class={styles["file-node-btn-icon"]} style={{ "padding-left": props.node.isFile() ? "1.5rem" : "0" }}>
              {props.node.icon()}
            </span>
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
  const { code, selectedNode, navigateToFile } = useContext(EditorContext) as IEditorContext;

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
          const newNode = await node?.createDocument(value as string, SagDocumentType.FILE, node?.path() as string);
          if (newNode && newNode instanceof TreeNode) {
            navigateToFile(newNode);
            node?.setIsExpanded(true);
          }
        }

        break;
      }
      case MenuOption.AddFileFromTemplate: {
        // Traverse the tree up to the org level
        const orgNode = node?.getOrganisationNode();
        if (!orgNode) {
          console.error("Error finding the org node for the current node: ", node);
          Notification.fire({
            title: "Couldn't find the templates of the organisation",
            icon: "error",
          });
          return;
        }

        // Select the child node that has `docType` folder and `isTemplate` true
        const templateNode = orgNode?.children.find(
          (child) => child.docType === SagDocumentType.FOLDER && child.isTemplate,
        );
        // console.log("Template node: ", templateNode);
        // If no template folder is found for the organisation, show an error message
        if (!templateNode) {
          Notification.fire({
            title: "No templates folder found for the organisation",
            icon: "error",
          });
          return;
        }

        // Recursively get all the templates in the templates folder
        interface Templates {
          [key: string]: string;
        }
        const getTemplates = (node: TreeNode, acc: Templates): Templates => {
          node.children.forEach((child) => {
            if (child.docType === SagDocumentType.FILE) {
              acc[child.path() as string] = child.name() as string;
            } else if (child.docType === SagDocumentType.FOLDER) {
              // Recursively call getTemplates for folder nodes
              getTemplates(child, acc);
            }
          });
          return acc;
        };
        const templates: Templates = getTemplates(templateNode, {});

        // If there are no templates for the organisation, show an error message
        if (Object.keys(templates).length === 0) {
          Notification.fire({
            title: "No templates found for the organisation",
            icon: "error",
          });
          return;
        }

        // Show a select input with the possible templates of the organisation
        const { value } = await Swal.fire<string>({
          title: "Select a Template",
          input: "select",
          inputOptions: templates,
          inputPlaceholder: "Choose a template",
          showCancelButton: true,
          confirmButtonText: "Select",
          inputValidator: (value) => {
            return new Promise((resolve) => {
              if (value) {
                resolve(null);
              } else {
                resolve("You need to select a template to proceed");
              }
            });
          },
        });

        if (value) {
          // Get the selected template based on the path and then its content
          let selectedTemplateNode = templateNode;
          for (let i = 1; i < value.split(".").length; i++) {
            console.log("Selected template node: ", selectedTemplateNode.path());
            selectedTemplateNode = selectedTemplateNode.findChild({ path: value }) as TreeNode;
          }
          const templateContent = await selectedTemplateNode.getContent();
          if (!templateContent) {
            Notification.fire({
              title: "Error fetching template content",
              icon: "error",
            });
            return;
          }

          // Create a new file with the selected template's content
          const filenameSwal = await Prompt.fire<string>({
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
          if (filenameSwal.value && filenameSwal.value.length > 0) {
            const node = selectedNode();
            const newNode = await node?.createDocument(
              filenameSwal.value as string,
              SagDocumentType.FILE,
              node?.path() as string,
              templateContent,
            );
            console.log("Navigating to the new node: ", newNode);
            if (newNode && newNode instanceof TreeNode) {
              navigateToFile(newNode); // Navigate context to the file
              node?.setIsExpanded(true); // Expand the folder above it (it should be enough as to create the file you need access to the folder)
            }
          }
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
          node?.setIsExpanded(true);
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
                when={
                  [SagDocumentType.FOLDER, SagDocumentType.FILE].includes(selectedNode()?.docType as SagDocumentType) &&
                  !(
                    selectedNode()?.isTemplate &&
                    selectedNode()?.docType === SagDocumentType.FOLDER &&
                    selectedNode()?.path() === "templates"
                  )
                }
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
                when={
                  [SagDocumentType.FOLDER, SagDocumentType.FILE].includes(selectedNode()?.docType as SagDocumentType) &&
                  !(
                    selectedNode()?.isTemplate &&
                    selectedNode()?.docType === SagDocumentType.FOLDER &&
                    selectedNode()?.path() === "templates"
                  )
                }
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
                when={
                  [SagDocumentType.FOLDER, SagDocumentType.PROJECT].includes(
                    selectedNode()?.docType as SagDocumentType,
                  ) && !(selectedNode()?.isTemplate && selectedNode()?.docType === SagDocumentType.FOLDER)
                }
              >
                <ContextMenu.Item
                  class={styles["context-menu-item"]}
                  onSelect={async () => {
                    await handleContextMenu(MenuOption.AddFileFromTemplate);
                  }}
                >
                  {MenuOption.AddFileFromTemplate}
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
