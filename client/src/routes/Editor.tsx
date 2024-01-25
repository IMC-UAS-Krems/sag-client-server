import { Component, createSignal, Show } from "solid-js";
import {
    createCodeMirror,
    createEditorControlledValue,
} from "solid-codemirror";
import { type Transaction } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { eden } from "@client/api";
import "../styles/Editor.css";
// import { useI18n } from "@solid-primitives/i18n";
import { Button } from "@kobalte/core";
import { Alert } from "@kobalte/core";
import cors from "@elysiajs/cors";

const t = (s: string) => s;

type CompileResult = {
    error: string | undefined;
    url: string | undefined;
};

const compile = async (code: string): Promise<CompileResult | undefined> => {
    // Perform the compilation logic here
    try {
        const compileResult = await eden.api.compile.post({ code });
        // console.log("compileResult: ", compileResult);

        if (compileResult.error || !compileResult.data) {
            console.log(compileResult.error);
            return {
                error: compileResult.error?.value,
                url: undefined,
            };
        }

        const url = await fetch("https://sag-deploy.azurewebsites.net/deploy", {
            body: JSON.stringify({
                user_id: compileResult.data.user_id,
                source: JSON.stringify(compileResult.data.compiled),
            }),
            mode: "cors",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((res) => res.text())
            .then((res) => {
                console.log("res: ", res);
                return res;
            });

        console.log("Success: ", compileResult.data);
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

export const Editor: Component = () => {
    const [code, setCode] = createSignal("");
    // const [t, { add, locale, dict }] = useI18n();
    const [url, setUrl] = createSignal<string | undefined>(undefined);

    const {
        editorView,
        ref: editorRef,
        createExtension,
    } = createCodeMirror({
        value: code(),
        onValueChange: (value) => {
            // console.log("value changed", value);
            setCode(value);
        },
        // onModelViewUpdate: (modelView) =>
        //     console.log("modelView updated", modelView),
        // onTransactionDispatched: (tr: Transaction, view: EditorView) =>
        //     console.log("Transaction", tr),
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

    return (
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
                            setUrl(
                                `Error: ${result.error}\nPlease check your code and try again.`
                            );
                        } else {
                            setUrl(
                                `Success! Navigate to ${result.url} to visualize the dashboard.`
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
                <div class="left-column">{t("Left")}</div>

                <div class="middle-column">
                    <div ref={editorRef} />
                </div>
                <div class="right-column">{t("Right")}</div>
            </div>
        </main>
    );
};

export default Editor;
