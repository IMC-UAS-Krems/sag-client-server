import { EditorView, ViewPlugin, Decoration, DecorationSet } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/rangeset";

// const placeholderRegex = /<\s*[\w.-]+\s*>/g;
const placeholderRegex = /import/g;

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
              class: "text-orange-400 font-bold",
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
