import { Component } from "solid-js";

// const Editor: Component = () => {
//   return <div>WORK IN PROGRESS: EDITOR</div>;
// };
//
// export default Editor;

import {
  createCodeMirror,
  createEditorControlledValue,
} from "solid-codemirror";
import { createSignal, onMount } from "solid-js";
import { type Transaction } from "@codemirror/state";
import { type EditorView } from "@codemirror/view";

export const Editor: Component = () => {
  const [code, setCode] = createSignal("Start typing here...");

  const { editorView, ref: editorRef } = createCodeMirror({
    /**
     * The initial value of the editor
     */
    value: code(),
    /**
     * Fired whenever the editor code value changes.
     */
    onValueChange: (value) => {
      console.log("value changed", value);
      setCode(value);
    },
    /**
     * Fired whenever a change occurs to the document, every time the view updates.
     */
    onModelViewUpdate: (modelView) =>
      console.log("modelView updated", modelView),
    /**
     * Fired whenever a transaction has been dispatched to the view.
     * Used to add external behavior to the transaction [dispatch function](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) for this editor view, which is the way updates get routed to the view
     */
    onTransactionDispatched: (tr: Transaction, view: EditorView) =>
      console.log("Transaction", tr),
  });

  createEditorControlledValue(editorView, code);

  return <div ref={editorRef} />;
};

export default Editor;
