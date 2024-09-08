import { JSX, Component, createSignal, Show, createContext, useContext } from "solid-js";
import { linter, Diagnostic, lintGutter } from "@codemirror/lint";
import { createCodeMirror, createEditorControlledValue } from "solid-codemirror";
import { EditorView, lineNumbers } from "@codemirror/view";
import { eden } from "@client/api";
import "../styles/Editor.css";
import { Button } from "@kobalte/core";
import { Alert } from "@kobalte/core";
import { errors, setErrors, Error } from "@store/index";
import { RightSideBar } from "../components/RightSideBar";
import { keymap } from "@codemirror/view";
import Header from "@client/components/Header";
import { LeftSideBar } from "@client/components/LeftSideBar";
import { IEditorContext } from "@client/types";

type CompileResult = {
  error: string | undefined;
  url: string | undefined;
};

const compile = async (code: string): Promise<CompileResult | undefined> => {
  // Perform the compilation logic here
  try {
    const compileResult = await eden.api.compile.post({
      code,
      $fetch: {
        mode: "cors",
        credentials: "include",
        method: "POST",
      },
    });
    console.log("compileResult: ", compileResult);

    if (compileResult.data?.status === "error" && code.trim() !== "") {
      if (compileResult.data?.hasOwnProperty("errors")) {
        // FIX: these 2 `if` statements should be combined into one. On error the message is "Something went wrong. Please try again." because result is undefined. This is not a good user experience.
        // moreover, there is no `data?.error` property
        const errors = compileResult.data?.errors as Error[];

        setErrors(errors);
        return;
      } else {
        setErrors([]);

        return {
          error: compileResult.data?.error,
          url: undefined,
        };
      }
    }
    setErrors([]);
    const url = compileResult.data?.url;

    return {
      error: undefined,
      url: url,
    };

    // Handle the compilation result as needed
  } catch (error) {
    console.error("Error during compilation: ", error);
    // Handle the error during compilation
  }
};

const check = async (code: string): Promise<CompileResult | undefined> => {
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
    console.log("compileResult: ", compileResult);

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
};

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
  console.log(errorMap);
  return errorMap;
};

export const EditorContext = createContext<IEditorContext>();

export function EditorProvider(props) {
  const [code, setCode] = createSignal("");

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
      // console.log("value changed", value);
      setCode(value);
      check(value);
    },
    // onModelViewUpdate: (modelView) =>
    //     console.log("modelView updated", modelView),
    // onTransactionDispatched: (tr: Transaction, view: EditorView) =>
    //     console.log("Transaction", tr),
  });

  return (
    <EditorContext.Provider value={{ editorView, editorRef, createExtension, handleFileClick, code, setCode }}>
      {props.children}
    </EditorContext.Provider>
  );
}

const Editor: Component = () => {
  const [url, setUrl] = createSignal<JSX.Element | undefined>(undefined);
  const { editorView, editorRef, createExtension, code } = useContext(EditorContext) as IEditorContext;

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
        <Show when={url() !== undefined}>
          <Alert.Root class="alert">{url()}</Alert.Root>
        </Show>
        <Button.Root
          class="compile"
          onClick={async () => {
            setUrl("Compiling...");

            const result = await compile(code());

            if (result === undefined) {
              setUrl("Something went wrong. Please try again.");
            } else {
              if (result.error) {
                setUrl(<span>Error: {result.error}\nPlease check your code and try again.</span>);
              } else {
                setUrl(
                  <span>
                    Success! Navigate to{" "}
                    <a href={result.url?.replaceAll('"', "")} target="_blank">
                      {result.url}
                    </a>{" "}
                    to visualize the dashboard.
                  </span>,
                );
              }

              setTimeout(() => {
                setUrl(undefined);
              }, 10000);
            }
          }}
        >
          Compile
        </Button.Root>
        <div class="editor-container">
          <LeftSideBar />
          <div class="middle-column">
            <div ref={editorRef}></div>
          </div>
          <RightSideBar />
        </div>
      </main>
    </Header>
  );
};

export default Editor;
