import { TreeNode } from "@client/components/LeftSideBar.tsx";
import { check } from "@client/routes/Editor.tsx";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { CompartmentReconfigurationCallback, createCodeMirror } from "solid-codemirror";
import { Accessor, createContext, createSignal, JSX, Setter } from "solid-js";
import Swal from "sweetalert2";

export interface IEditorContext {
  editorView: Accessor<EditorView>;
  editorRef: Setter<HTMLElement>;
  createExtension: (extension: Extension | Accessor<Extension | undefined>) => CompartmentReconfigurationCallback;
  // handleFileClick: (content: string | undefined) => void;
  navigateToFile: (newNode: TreeNode) => void;
  code: Accessor<string>;
  setCode: Setter<string>;
  setSelectedNode: Setter<TreeNode | null>;
  selectedNode: Accessor<TreeNode | null>;
}

export const EditorContext = createContext<IEditorContext>();

export function EditorProvider(props: { children: JSX.Element }): JSX.Element {
  const [code, setCode] = createSignal("");
  const [selectedNode, setSelectedNode] = createSignal<TreeNode | null>(null);
  // Track if the editor has been initialized to skip unsaved changes check on initial file load
  const [isEditorInitialized, setIsEditorInitialized] = createSignal(false);

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
    if (selectedNode() instanceof TreeNode) {
      if (isSameNode(newNode, selectedNode() as TreeNode)) {
        return;
      }
    }

    const currentContent = code();

    if (selectedNode()?.isFile()) {
      const savedContent = (await selectedNode()?.getContent()) ?? "";
      if (!isEditorInitialized()) {
        setIsEditorInitialized(true);
        // } else if (currentContent.trim() === "" || currentContent !== savedContent || savedContent === "") {
      } else if (currentContent !== savedContent) {
        try {
          const result = await Swal.fire({
            title: "Unsaved Changes",
            text: "The current file has unsaved changes. Save it before leaving?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes",
            cancelButtonText: "No",
          });

          if (result.isConfirmed) {
            try {
              await selectedNode()?.saveContent(currentContent);
            } catch (error) {
              console.error("Failed to save content:", error);
            }
          }
        } catch (error) {
          console.error("Swal prompt failed:", error);
        }
      }
    }
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

  const debouncedCheck = (() => {
    let checkTimer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(checkTimer);
      checkTimer = setTimeout(() => {
        check(value);
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
      value={{ editorView, editorRef, createExtension, code, setCode, selectedNode, setSelectedNode, navigateToFile }}
    >
      {props.children}
    </EditorContext.Provider>
  );
}
