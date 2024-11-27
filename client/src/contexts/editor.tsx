import { TreeNode } from "@client/components/LeftSideBar";
import { check } from "@client/routes/Editor";
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

  const navigateToFile = async (newNode: TreeNode) => {
    if (selectedNode()?.path() === newNode.path()) {
      return;
    }

    const currentContent = code();
    const savedContent = (await selectedNode()?.getContent()) ?? "";

    if (!isEditorInitialized()) {
      setIsEditorInitialized(true);
    } else if (currentContent.trim() === "" || currentContent !== savedContent || savedContent === "") {
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

    try {
      const newContent = await newNode.getContent();
      handleFileClick(newContent);
      setSelectedNode(newNode);
    } catch (error) {
      console.error("Failed to navigate to file:", newNode.name(), error);
    }
  };

  const {
    editorView,
    ref: editorRef,
    createExtension,
  } = createCodeMirror({
    value: code(),
    onValueChange: (value) => {
      setCode(value);
      check(value);
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
