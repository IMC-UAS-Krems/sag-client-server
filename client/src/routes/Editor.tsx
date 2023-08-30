import { Component, createSignal } from "solid-js";
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
import { useI18n } from "@solid-primitives/i18n";
import { Button } from "@kobalte/core";

const compile = async (code: string) => {
	// Perform the compilation logic here
	try {
		const compileResult = await eden.api.compile.post({ code });

		if (compileResult.error) {
			console.log("Compiled: ", compileResult.error);
		} else {
			console.log("Compilation error: ", compileResult.data);
		}

		// Handle the compilation result as needed
	} catch (error) {
		console.error("Error during compilation: ", error);
		// Handle the error during compilation
	}
};

export const Editor: Component = () => {
	const [code, setCode] = createSignal("");
	const [t, { add, locale, dict }] = useI18n();

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
		<>
			<Button.Root class="compile" onClick={() => compile(code())}>
				Compile
			</Button.Root>
			<div class="editor-container">
				<div class="left-column">{t("Left")}</div>
				<div class="middle-column">
					<div ref={editorRef} />
				</div>
				<div class="right-column">{t("Right")}</div>
			</div>
		</>
	);
};

export default Editor;
