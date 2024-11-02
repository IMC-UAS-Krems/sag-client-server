import { TreeNode } from "@client/components/LeftSideBar";
import { check } from "@client/routes/Editor";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { CompartmentReconfigurationCallback, createCodeMirror } from "solid-codemirror";
import { Accessor, createContext, createSignal, JSX, Setter } from "solid-js";

export interface IEditorContext {
  editorView: Accessor<EditorView>;
  editorRef: Setter<HTMLElement>;
  createExtension: (extension: Extension | Accessor<Extension | undefined>) => CompartmentReconfigurationCallback;
  handleFileClick: (content: string | undefined) => void;
  code: Accessor<string>;
  setCode: Setter<string>;
  setSelectedNode: Setter<TreeNode | null>;
  selectedNode: Accessor<TreeNode | null>;
}

export const EditorContext = createContext<IEditorContext>();

export function EditorProvider(props: { children: JSX.Element }): JSX.Element {
  const [code, setCode] = createSignal("");
  const [selectedNode, setSelectedNode] = createSignal<TreeNode | null>(null);

  const handleFileClick = (content: string | undefined) => {
    editorView().dispatch({
      changes: {
        from: 0,
        to: editorView().state.doc.length,
        insert: content,
      },
    });
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
      value={{ editorView, editorRef, createExtension, handleFileClick, code, setCode, selectedNode, setSelectedNode }}
    >
      {props.children}
    </EditorContext.Provider>
  );
}
