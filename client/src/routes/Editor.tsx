import { Component, createSignal } from "solid-js";
import {
  createCodeMirror,
  createEditorControlledValue,
} from "solid-codemirror";
import { type Transaction } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { eden } from "@client/rpc";
import "../Editor.css";

const compileCode = async () => {
  // Perform the compilation logic here
  try {
    const compileResult = await eden.compile.post({ file: "hello" });
    console.log("Compilation result: ", compileResult);
    // Handle the compilation result as needed
  } catch (error) {
    console.error("Error during compilation: ", error);
    // Handle the error during compilation
  }
};

export const Editor: Component = () => {
  const [code, setCode] = createSignal("Start typing here...");

  const {
    editorView,
    ref: editorRef,
    createExtension,
  } = createCodeMirror({
    value: code(),
    onValueChange: (value) => {
      console.log("value changed", value);
      setCode(value);
    },
    onModelViewUpdate: (modelView) =>
      console.log("modelView updated", modelView),
    onTransactionDispatched: (tr: Transaction, view: EditorView) =>
      console.log("Transaction", tr),
  });

  createEditorControlledValue(editorView, code);

  const styles = HighlightStyle.define([
    { tag: tags.keyword, color: "#fc6", fontWeight: "bold" }, // Customize the style for keywords (e.g., "import", "const", "function")
    { tag: tags.comment, color: "#f5d", fontStyle: "italic" }, // Customize the style for comments
    // { tag: "test1", color: "blue" }, // Custom style for "test1"
    // { tag: "test2", color: "green" }, // Custom style for "test2"
  ]);

  // make myHighlightStyle into extension
  createExtension(syntaxHighlighting(styles));

  createExtension(lineNumbers);

  return (
    <>
      <button class="compile" onClick={compileCode}>
        Compile
      </button>
      <div class="editor-container">
        <div class="left-column">Left</div>
        <div class="middle-column">
          <div class="editor-box" ref={editorRef}></div>
        </div>
        <div class="right-column">Right</div>
      </div>
    </>
  );
};

export default Editor;
