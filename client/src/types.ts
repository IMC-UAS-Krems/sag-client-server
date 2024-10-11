import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { CompartmentReconfigurationCallback } from "solid-codemirror";
import { Accessor, Setter } from "solid-js";
import { TreeNode } from "@client/components/LeftSideBar";

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

export interface IInputDialogContext {
  showInputDialog: Accessor<boolean>;
  setShowInputDialog: Setter<boolean>;
}
