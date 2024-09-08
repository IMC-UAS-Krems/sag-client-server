import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { CompartmentReconfigurationCallback } from "solid-codemirror";
import { Accessor, Setter } from "solid-js";

export interface IMenuContext {
  showMenu: (e: MouseEvent) => void;
  hideMenu: () => void;
  isVisible: Accessor<boolean>;
  position: Accessor<{ x: number; y: number }>;
}

export interface IEditorContext {
  editorView: Accessor<EditorView>;
  editorRef: Setter<HTMLElement>;
  createExtension: (extension: Extension | Accessor<Extension | undefined>) => CompartmentReconfigurationCallback;
  handleFileClick: (content: string | undefined) => void;
  code: Accessor<string>;
  setCode: Setter<string>;
}
