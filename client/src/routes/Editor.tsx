import { JSX, createSignal, useContext, createEffect } from "solid-js";
import { createEditorControlledValue } from "solid-codemirror";
import { linter, Diagnostic, lintGutter } from "@codemirror/lint";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";

import { eden } from "@client/api/index.ts";
import commonStyles from "@client/styles/Common.module.css";
import { errors, setErrors, Error as CompileError } from "@store/index.ts";
import { RightSideBar } from "../components/RightSideBar.tsx";
import placeholderHighlightPlugin from "@client/editor_plugins/PlaceHolderHighlight.ts";
import Header from "@client/components/Header.tsx";
import { LeftSideBar, TreeNode } from "@client/components/LeftSideBar.tsx";
import { EditorContext, IEditorContext } from "@client/contexts/editor.tsx";
import { Notification } from "@client/common.ts";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@client/components/ui/breadcrumb.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu.tsx";
import { Button } from "@client/components/ui/button.tsx";
import { showToast, showToastPromise } from "@client/components/ui/toast.tsx";
import SaveAsTemplateDialog from "@client/components/SaveAsTemplateDialog.tsx";

type CompileResult = {
  error: string | undefined;
  url: string | undefined;
};

const [isCompiled, setIsCompiled] = createSignal(false);
const [dashboardUrl, setDashboardUrl] = createSignal<string | null>(null);

// TODO: Refactor and test this more with the compiler too
async function compile(code: string) {
  try {
    console.log("Making compile fetch...");

    // Create a manually controlled promise to ensure proper state tracking
    showToastPromise(
      () => {
        return new Promise((resolve, reject) => {
          // Make the API call
          eden.api.compile
            .post({
              code,
              $fetch: {
                mode: "cors",
                credentials: "include",
                method: "POST",
              },
            })
            .then((result: { error?: string; data?: CompileResult }) => {
              console.log("API call completed:", result);

              // Handle API-level errors
              if (result.error) {
                reject(new Error(result.error.value.name));
                return;
              }

              // Handle compilation errors
              if (result.data?.status === "error" && code.trim() !== "") {
                if (result.data?.hasOwnProperty("errors")) {
                  const errorsArr = result.data.errors as CompileError[];
                  setErrors(errorsArr);
                  reject(new Error("Compilation error"));
                  return;
                }
              }

              // Success case
              setErrors([]);
              const url = result.data?.url;
              setIsCompiled(true);
              setDashboardUrl(url);
              resolve(result); // Resolve with the complete result
            })
            .catch((err) => {
              console.error("API call failed:", err);
              reject(err);
            });
        });
      },
      {
        loading: <div>Compiling...</div>,
        success: (data) => {
          console.log("Toast success handler:", data);
          const url = data.data?.url;
          return (
            <a href={url} class={commonStyles["notification-deploy-link"]} target="_blank">
              Dash deployed successfully to Azure
              <br />
              Click here to access
            </a>
          );
        },
        error: (err) => {
          console.log("Toast error handler:", err);
          return <div>{err.message || "Compilation failed"}</div>;
        },
        duration: 30000,
      },
    );
  } catch (error) {
    console.error("Error during compilation:", error);
    // Additional error handling if needed
  }
}

// TODO: Delete old compile function
// async function compile(code: string): Promise<CompileResult | undefined> {
//   // Perform the compilation logic here
//   try {
//     Notification.fire({
//       icon: "info",
//       titleText: "Compiling",
//       timer: 5000,
//     });

//     Notification.stopTimer();
//     const compileResult = await eden.api.compile.post({
//       code,
//       $fetch: {
//         mode: "cors",
//         credentials: "include",
//         method: "POST",
//       },
//     });

//     if (compileResult.error) {
//       Notification.update({
//         title: "Error",
//         titleText: compileResult.error.value.name,
//         icon: "error",
//       });

//       Notification.toggleTimer();

//       return;
//     }

//     if (compileResult.data?.status === "error" && code.trim() !== "") {
//       if (compileResult.data?.hasOwnProperty("errors")) {
//         // FIX: these 2 `if` statements should be combined into one. On error the message is "Something went wrong. Please try again." because result is undefined. This is not a good user experience.
//         // moreover, there is no `data?.error` property
//         const errors = compileResult.data?.errors as CompileError[];

//         setErrors(errors);
//         return;
//       } else {
//         setErrors([]);
//       }
//     }
//     setErrors([]);
//     const url = compileResult.data?.url;

//     Notification.update({
//       title: `<span>Dash deployed successfully to Azure<br>`,
//       titleText: undefined,
//       html: (
//         <a href={url} class={commonStyles["notification-deploy-link"]} target="_blank">
//           Click here to access
//         </a>
//       ),
//       icon: "success",
//     });

//     Notification.toggleTimer();

//     setIsCompiled(true);
//     setDashboardUrl(url);

//     // Handle the compilation result as needed
//   } catch (error) {
//     console.error("Error during compilation: ", error);
//     // Handle the error during compilation
//   }
// }

const handleOpenWindow = (url: string) => {
  window.open(url, "_blank");
};

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
      const errors = compileResult.data?.errors as CompileError[];
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
  const errorMap = new Map<number, CompileError[]>();
  for (const error of errorList) {
    if (errorMap.has(error.line_start)) {
      errorMap.get(error.line_start)?.push(error);
    } else {
      errorMap.set(error.line_start, [error]);
    }
  }
  return errorMap;
};

function FileTreeBreadcrumb(lastSelectedNode: TreeNode | null): JSX.Element {
  if (!lastSelectedNode) {
    return <></>;
  }

  const pathList = lastSelectedNode.getPathList();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {pathList.length > 5 ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink>{pathList[0]}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbEllipsis />
            <BreadcrumbSeparator />
            {pathList.slice(-3).map((name, index) => (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink {...(index === 2 ? { current: true } : {})}>{name}</BreadcrumbLink>
                </BreadcrumbItem>
                {index !== 2 && <BreadcrumbSeparator />}
              </>
            ))}
          </>
        ) : (
          <>
            {pathList.map((name, index) => (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink {...(index === pathList.length - 1 ? { current: true } : {})}>{name}</BreadcrumbLink>
                </BreadcrumbItem>
                {index < pathList.length - 1 && <BreadcrumbSeparator />}
              </>
            ))}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function Editor(): JSX.Element {
  const { editorView, editorRef, createExtension, code, selectedNode, navigateToFile } = useContext(
    EditorContext,
  ) as IEditorContext;

  const [lastSelectedFile, setLastSelectedFile] = createSignal<TreeNode | null>(null);

  // track the saved content
  const [savedContent, setSavedContent] = createSignal<string | null>(null);
  const hasUnsavedChanges = () => savedContent() !== code();

  // track selected node attributes
  const isTemplate = () => lastSelectedFile()?.isTemplate || false;

  createEffect(() => {
    const node = selectedNode();
    if (node !== null) {
      setLastSelectedFile(node);
      if (node.isFile()) {
        node.getContent().then((content) => setSavedContent(content));
        setIsCompiled(false);
        setDashboardUrl(null);
      }
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
  createExtension(placeholderHighlightPlugin);

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

  // console.log("Selected node in the editor:", selectedNode());

  return (
    <Header>
      <main>
        {/* --- CONTEXT ROW --- */}
        <div class="flex items-center content-between mx-4 pb-3">
          {/* --- Breadcrumb --- */}
          {FileTreeBreadcrumb(lastSelectedFile())}
          {/* --- Actions --- */}
          <div class="flex ml-auto gap-1.5">
            {!isTemplate() && (
              <>
                <Button
                  {...(lastSelectedFile()?.isFile() ? {} : { disabled: true })}
                  onClick={async () => {
                    await compile(code());
                  }}
                >
                  Compile
                </Button>
                <Button
                  onClick={() => {
                    const url = dashboardUrl();
                    if (url) {
                      handleOpenWindow(url);
                    } else {
                      showToast({
                        title: "Error",
                        description: "Dashboard not deployed yet",
                        variant: "error",
                        duration: 5000,
                      });
                    }
                  }}
                  disabled={!isCompiled()}
                >
                  Open Dashboard
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={!lastSelectedFile()?.isFile() && !(lastSelectedFile()?.isFile() && hasUnsavedChanges())}
                  >
                    <Button
                      disabled={!lastSelectedFile()?.isFile() && !(lastSelectedFile()?.isFile() && hasUnsavedChanges())}
                    >
                      Save as
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        disabled={!(lastSelectedFile()?.isFile() && hasUnsavedChanges())}
                        onSelect={async () => {
                          const node = selectedNode();
                          if (node !== null) {
                            const success = await node.saveContent(code());
                            if (success) {
                              setSavedContent(code());
                            }
                          }
                        }}
                      >
                        Save as File
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!lastSelectedFile()?.isFile() || !(selectedNode() instanceof TreeNode)}
                        closeOnSelect={false}
                      >
                        <SaveAsTemplateDialog
                          content={code()}
                          node={selectedNode() as TreeNode}
                          navigateToFile={navigateToFile}
                        />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenu>
              </>
            )}
            {isTemplate() && (
              <Button
                disabled={!(lastSelectedFile()?.isFile() && hasUnsavedChanges())}
                onClick={async () => {
                  const node = selectedNode();
                  console.log("Calling save on template node:", node);
                  if (node !== null) {
                    const success = await node.saveContent(code());
                    if (success) {
                      setSavedContent(code());
                    }
                  }
                }}
              >
                Update template
              </Button>
            )}
          </div>
        </div>
        {/* --- EDITOR --- */}
        <div class="flex h-[86vh]">
          <LeftSideBar />
          <div class="flex-[2] overflow-y-scroll bg-accent/20 border-1 border-accent-foreground/20">
            <div ref={editorRef} class="pb-1"></div>
          </div>
          <RightSideBar />
        </div>
      </main>
    </Header>
  );
}

export default Editor;
