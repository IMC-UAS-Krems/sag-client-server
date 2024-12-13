import { EditorView, ViewPlugin, Decoration, DecorationSet } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/rangeset";
import styles from "@client/styles/Editor.module.css";

const placeholderRegex = /<\s*[\w.-]+\s*>/g;

const placeholderHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.computeDecorations(view);
    }

    computeDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let match;
        while ((match = placeholderRegex.exec(text))) {
          const start = from + match.index;
          const end = start + match[0].length;
          builder.add(
            start,
            end,
            Decoration.mark({
              class: styles["placeholder-highlight"],
            }),
          );
        }
      }
      return builder.finish();
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.computeDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

export default placeholderHighlightPlugin;
