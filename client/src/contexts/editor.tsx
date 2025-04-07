import { TreeNode } from "@client/components/LeftSideBar.tsx";
import { check } from "@client/routes/Editor.tsx";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { CompartmentReconfigurationCallback, createCodeMirror } from "solid-codemirror";
import { Accessor, createContext, createSignal, JSX, Setter } from "solid-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@client/components/ui/dialog.tsx";
import { Button } from "@client/components/ui/button.tsx";
import { IoAlertCircle } from "solid-icons/io";

export interface IEditorContext {
  editorView: Accessor<EditorView>;
  editorRef: Setter<HTMLElement>;
  createExtension: (extension: Extension | Accessor<Extension | undefined>) => CompartmentReconfigurationCallback;
  // handleFileClick: (content: string | undefined) => void;
  navigateToFile: (newNode: TreeNode) => void;
  getRelativeNodeByPath: (path: string) => TreeNode | null;
  code: Accessor<string>;
  setCode: Setter<string>;
  setSelectedNode: Setter<TreeNode | null>;
  selectedNode: Accessor<TreeNode | null>;
  handleFileClick: (content: string | undefined) => void;
}

export const EditorContext = createContext<IEditorContext>();

export function EditorProvider(props: { children: JSX.Element }): JSX.Element {
  const [code, setCode] = createSignal("");
  const [selectedNode, setSelectedNode] = createSignal<TreeNode | null>(null);
  // NOTE: This is no longer needed with new Editor logic
  // Track if the editor has been initialized to skip unsaved changes check on initial file load
  // const [isEditorInitialized, setIsEditorInitialized] = createSignal(false);
  const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] = createSignal(false);

  // For awaiting the user's choice on unsaved changes - create deferred promise
  let unsavedChangesResolve: ((choice: boolean) => void) | null = null;
  const confirmUnsavedChanges = (): Promise<boolean> => {
    return new Promise((resolve) => {
      unsavedChangesResolve = resolve;
      setUnsavedChangesDialogOpen(true);
    });
  };

  const handleFileClick = (content: string | undefined) => {
    editorView().dispatch({
      changes: {
        from: 0,
        to: editorView().state.doc.length,
        insert: content,
      },
    });
  };

  const isSameNode = (node1: TreeNode, node2: TreeNode) => {
    const path1 = node1.path();
    const path2 = node2.path();

    // 1. If path names don't match return false
    if (path1 !== path2) {
      return false;
    }
    const pathList1 = node1.getPathList();
    const pathList2 = node2.getPathList();

    // 2. If path lists don't match return false
    if (pathList1.length !== pathList2.length) {
      return false;
    }
    for (let i = 0; i < pathList1.length; i++) {
      if (pathList1[i] !== pathList2[i]) {
        return false;
      }
    }

    // 3. If both path names and path lists match return true
    return true;
  };

  const navigateToFile = async (newNode: TreeNode) => {
    // If user pressed on the currently selected node, do nothing - if no node is selected, skip check
    if (selectedNode() instanceof TreeNode && isSameNode(newNode, selectedNode() as TreeNode)) {
      return;
    }

    const currentContent = code();

    // If the selected node is a file, check if it has unsaved changes
    if (selectedNode()?.isFile()) {
      // Get saved content of the currently node
      const savedContent = (await selectedNode()?.getContent()) ?? "";

      // NOTE: There is apparently no need to check for initialization and empty content anymore
      // if (!isEditorInitialized()) {
      //   setIsEditorInitialized(true);
      //   return;
      // }
      // } else if (currentContent.trim() === "" || currentContent !== savedContent || savedContent === "") {
      if (currentContent !== savedContent) {
        // Instead of Swal, wait for the custom dialog answer.
        const saveChanges = await confirmUnsavedChanges();
        if (saveChanges) {
          try {
            await selectedNode()?.saveContent(currentContent);
          } catch (error) {
            console.error("Failed to save content:", error);
          }
        }
      }
    }
    // Then once the unsaved changes check is done, navigate to the new node
    try {
      if (newNode.isFile()) {
        const newContent = await newNode.getContent();
        handleFileClick(newContent);
      } else {
        // If the node is a directory, clear the editor
        setCode("");
        handleFileClick("");
      }
      setSelectedNode(newNode);
    } catch (error) {
      console.error("Failed to navigate to file:", newNode.name(), error);
    }
  };

  const getRelativeNodeByPath = (path: string): TreeNode | null => {
    // First task is to get the project node from the current path
    // console.log("Getting relative node by path:", path);
    if (!selectedNode() || !(selectedNode() instanceof TreeNode)) {
      console.error("Can't find relative path node: Selected node is not a valid TreeNode");
      return null;
    }

    const currentNode = selectedNode() as TreeNode;
    const projectNode = currentNode.getProjectNode();
    if (!projectNode) {
      console.error("Can't find relative path node: Project node not found");
      return null;
    }

    let relativeNode: TreeNode | undefined = projectNode;
    for (let i = 0; i < path.split(".").length; i++) {
      if (!relativeNode) {
        console.error("Can't find relative path node: Relative node not found");
        return null;
      }
      relativeNode = relativeNode.findChild({ path: path });
    }

    if (relativeNode && relativeNode.path() === path) {
      return relativeNode;
    }
    return null;
  }

  interface Metadata {
    municipalityName: string;
    orgName: string;
    projectName: string;
    path: string;
    filename: string;
  }

  const debouncedCheck = (() => {
    let checkTimer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(checkTimer);
      checkTimer = setTimeout(() => {
        const currentNode = selectedNode();
        if (!currentNode) {
          return;
        }
        check(value, {
          municipalityName: currentNode.municipalityName || "",
          orgName: currentNode.orgName || "",
          projectName: currentNode.projectName || "",
          path: currentNode.path(),
          filename: currentNode.name(),
        } as Metadata);
      }, 500);
    };
  })();

  // NOTE: Styling the editor can be done either via extensions or by modifying the default CSS styles
  // - We chose to use the default CSS styles for the simplicity of applying light/dark mode
  // - Modifications can be found at the top of global `index.css`
  const {
    editorView,
    ref: editorRef,
    createExtension,
  } = createCodeMirror({
    value: code(),
    onValueChange: (value) => {
      setCode(value);
      debouncedCheck(value);
    },
  });

  return (
    <EditorContext.Provider
      value={{
        editorView,
        editorRef,
        createExtension,
        code,
        setCode,
        selectedNode,
        setSelectedNode,
        navigateToFile,
        getRelativeNodeByPath,
        handleFileClick,
      }}
    >
      {props.children}
      <Dialog
        open={unsavedChangesDialogOpen()}
        onOpenChange={(open) => {
          // Optionally, you can reset the promise if the dialog is closed by other means.
          if (!open && unsavedChangesResolve) {
            unsavedChangesResolve(false);
            unsavedChangesResolve = null;
          }
          setUnsavedChangesDialogOpen(open);
        }}
        modal={true}
      >
        <DialogContent class="border-destructive">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2">
              <IoAlertCircle class="text-destructive w-7 h-7" />
              Unsaved Changes
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            The current file has unsaved changes.
            <br />
            Save it before leaving? All unsaved changes will be lost.
          </DialogDescription>
          <DialogFooter>
            <Button
              onClick={() => {
                if (unsavedChangesResolve) {
                  unsavedChangesResolve(true);
                  unsavedChangesResolve = null;
                }
                setUnsavedChangesDialogOpen(false);
              }}
            >
              Save
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (unsavedChangesResolve) {
                  unsavedChangesResolve(false);
                  unsavedChangesResolve = null;
                }
                setUnsavedChangesDialogOpen(false);
              }}
            >
              Don't Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EditorContext.Provider>
  );
}
