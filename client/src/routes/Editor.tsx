import { JSX, createSignal, useContext, createEffect } from "solid-js";
import { createEditorControlledValue } from "solid-codemirror";
import { linter, Diagnostic, lintGutter } from "@codemirror/lint";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { Button } from "@kobalte/core";

import { eden } from "@client/api";
import styles from "@client/styles/Editor.module.css";
import { errors, setErrors, Error } from "@store/index";
import { RightSideBar } from "../components/RightSideBar";
import Header from "@client/components/Header";
import { LeftSideBar, TreeNode } from "@client/components/LeftSideBar";
import { EditorContext, IEditorContext } from "@client/contexts/editor";
import { Notification } from "@client/common";

type CompileResult = {
  error: string | undefined;
  url: string | undefined;
};

async function compile(code: string): Promise<CompileResult | undefined> {
  // Perform the compilation logic here
  try {
    Notification.fire({
      icon: "info",
      titleText: "Compiling",
      timer: 5000,
    });
    Notification.stopTimer();
    const compileResult = await eden.api.compile.post({
      code,
      $fetch: {
        mode: "cors",
        credentials: "include",
        method: "POST",
      },
    });

    if (compileResult.error) {
      Notification.update({
        title: "Error",
        titleText: compileResult.error.value.name,
        icon: "error",
      });

      Notification.toggleTimer();

      return;
    }

    if (compileResult.data?.status === "error" && code.trim() !== "") {
      if (compileResult.data?.hasOwnProperty("errors")) {
        // FIX: these 2 `if` statements should be combined into one. On error the message is "Something went wrong. Please try again." because result is undefined. This is not a good user experience.
        // moreover, there is no `data?.error` property
        const errors = compileResult.data?.errors as Error[];

        setErrors(errors);
        return;
      } else {
        setErrors([]);
      }
    }
    setErrors([]);
    const url = compileResult.data?.url;

    Notification.update({
      title: `<span>Dash deployed successfully to Azure<br>`,
      titleText: undefined,
      html: `<a href="${url}" class="text-gray-500 decoration-dotted underline" target="_blank">Click here to access</a><span>`,
      icon: "success",
    });

    Notification.toggleTimer();

    // Handle the compilation result as needed
  } catch (error) {
    console.error("Error during compilation: ", error);
    // Handle the error during compilation
  }
}

export async function check(code: string): Promise<void> {
  // Perform the compilation logic here
  try {
    const compileResult = await eden.api.check.post({
      code,
      $fetch: {
        mode: "cors",
        credentials: "include",
        method: "POST",
      },
    });

    if (compileResult.data?.status === "error" && code.trim() !== "") {
      const errors = compileResult.data?.errors as Error[];
      setErrors(errors);
    } else {
      setErrors([]);
    }

    // Handle the compilation result as needed
  } catch (error) {
    console.error("Error during compilation: ", error);
    // Handle the error during compilation
  }
}

const checkErrors = () => {
  const errorList = errors();
  const errorMap = new Map<number, Error[]>();
  for (const error of errorList) {
    if (errorMap.has(error.line_start)) {
      errorMap.get(error.line_start)?.push(error);
    } else {
      errorMap.set(error.line_start, [error]);
    }
  }
  return errorMap;
};

function Editor(): JSX.Element {
  const { editorView, editorRef, createExtension, code, selectedNode } = useContext(EditorContext) as IEditorContext;

  const [lastSelectedFile, setLastSelectedFile] = createSignal<TreeNode | null>(null);

  // track the saved content
  const [savedContent, setSavedContent] = createSignal<string | null>(null);

  const hasUnsavedChanges = () => savedContent() !== code();

  createEffect(() => {
    const node = selectedNode();
    if (node !== null) {
      setLastSelectedFile(node);
      node.getContent().then(content => setSavedContent(content));
      
    }
  });

  createEditorControlledValue(editorView, code);

  /*const styles = HighlightStyle.define([
      { tag: tags.keyword, color: "#fc6", fontWeight: "bold" }, // Customize the style for keywords (e.g., "import", "const", "function")
      { tag: tags.comment, color: "#f5d", fontStyle: "italic" }, // Customize the style for comments
      // { tag: "test1", color: "blue" }, // Custom style for "test1"
      // { tag: "test2", color: "green" }, // Custom style for "test2"
    ]);

    // make myHighlightStyle into extension
    createExtension(syntaxHighlighting(styles));*/

  createExtension(lineNumbers);

  const lint = linter((view: EditorView) => {
    const diagnostics: Diagnostic[] = [];
    const errorMap = checkErrors();
    let lineContainsOnlySpaces = 1;

    for (const [line, errors] of errorMap) {
      for (const error of errors) {
        const lineObj = view.state.doc.line(line);
        let from = 0;
        let to = lineObj.to;

        if (error.error === "Invalid indentation") {
          from = view.state.doc.line(line).from;
          for (let i = 0; i < lineObj.text.length; i++) {
            if (lineObj.text[i] !== " ") {
              to = lineObj.from + i;
              break;
            }
          }
        } else {
          from = lineObj.from;

          for (let i = 0; i < lineObj.text.length; i++) {
            if (lineObj.text[i] !== " ") {
              lineContainsOnlySpaces = 0;
              break;
            }
          }

          if (lineContainsOnlySpaces === 0) {
            for (let i = error.column_start - 1; i > -1; i--) {
              if (lineObj.text[i] === " ") {
                from = lineObj.from + i + 1;
                break;
              }
            }

            for (let i = error.column_start; i < lineObj.text.length; i++) {
              if (lineObj.text[i] === " ") {
                to = lineObj.from + i;
                break;
              }
            }
          }
        }

        diagnostics.push({
          from: from,
          to: to,
          message: error.error,
          severity: "error",
        });
      }
    }

    return diagnostics;
  });

  createExtension(lint);
  createExtension(lintGutter());

  const customKeyBehaviour = keymap.of([
    {
      key: "Tab",
      run: (view) => {
        const { state } = view;
        const selection = state.selection.main;

        const newCursorPosition = selection.head + 4;

        view.dispatch({
          changes: {
            from: selection.head,
            to: selection.head,
            insert: "    ",
          },
          selection: {
            anchor: newCursorPosition,
            head: newCursorPosition,
          },
        });
        return true;
      },
    },
    {
      key: "Enter",
      // Upon pressing enter, for the next line, have the indentation accordingly
      run: (view) => {
        const { state } = view;
        const selection = state.selection.main;
        const currentLine = state.doc.lineAt(selection.head);
        const currentLineText = currentLine.text;

        // get the amount of spaces in the beginning of the line
        let currentLineIndent = currentLineText.match(/^\s*/)?.[0] || "";

        //check if the last character of current line is a colon
        if (currentLineText.trim().endsWith(":")) {
          currentLineIndent += "    ";
        }

        view.dispatch({
          changes: {
            from: selection.head,
            to: selection.head,
            insert: "\n" + currentLineIndent,
          },
          selection: {
            anchor: selection.head + 1 + currentLineIndent.length,
            head: selection.head + 1 + currentLineIndent.length,
          },
        });
        return true;
      },
    },
  ]);

  createExtension(customKeyBehaviour);

  return (
    <Header>
      <main>
        <div class="flex flex-row justify-end mx-1 space-x-2">
          <Button.Root
            class={"bg-gray-900 hover:bg-black text-white font-bold py-1 px-5 rounded-xl focus:outline-none focus:shadow-outline text-lg w-32".concat(
              lastSelectedFile()?.isFile() ? "" : " cursor-not-allowed",
            )}
            {...(lastSelectedFile()?.isFile() ? {} : { disabled: true })}
            onClick={async () => {
              await compile(code());
            }}
          >
            Compile
          </Button.Root>
          <Button.Root
            class={`bg-gray-900 hover:bg-black text-white font-bold py-1 px-5 rounded-xl focus:outline-none focus:shadow-outline text-lg w-32${
              lastSelectedFile()?.isFile() && hasUnsavedChanges() ? "" : " cursor-not-allowed"
            }`}
            disabled={!(lastSelectedFile()?.isFile() && hasUnsavedChanges())}
            onClick={async () => {
              const node = selectedNode();
              if (node !== null) {
                node.saveContent(code());
                setSavedContent(code());
              }
            }}
          >
            Save File
          </Button.Root>
        </div>
        <div class={styles["editor-container"]}>
          <LeftSideBar />
          <div class={styles["middle-column"]}>
            <div ref={editorRef}></div>
          </div>
          <RightSideBar />
        </div>
      </main>
    </Header>
  );
}

export default Editor;
