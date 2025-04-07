import { hoverTooltip, Tooltip, EditorView } from "@codemirror/view";
import { TreeNode } from "@client/components/LeftSideBar.tsx";

// This regex matches the pattern "import <identifier>:" where identifier
// allows letters, numbers, underscores, and hyphens.
const importRegex = /import\s+([\w\d.-]+)(:)?/;

const importHoverTooltip = (getRelativeNodeByPath: (path: string) => TreeNode | null, navigateToFile: (newNode: TreeNode) => void) => hoverTooltip((view: EditorView, pos: number): Tooltip | null => {
    // Get the text of the line where the pointer is located
    const { from, to, text } = view.state.doc.lineAt(pos);
    // console.log(`Line text at ${pos} is: ${text}`);
    // console.log(`Line from ${from} to ${to}`);

    let match: RegExpExecArray | null;

    // Check all matches for the pattern in the current line
    while ((match = importRegex.exec(text)) !== null) {
        const matchStart = from + match.index;
        const matchEnd = matchStart + match[0].length;

        if (!match[1]) {
            return null; // Skip if no match found
        }

        const importedNode = getRelativeNodeByPath(match[1]);
        if (!importedNode) {
            return null; // Skip if no node found
        }

        // Check if pointer position falls within the match’s range
        if (pos >= matchStart && pos <= matchEnd) {
            return {
                pos: matchStart,
                end: matchEnd,
                above: true,
                create(view) {
                    const dom = document.createElement("div");
                    dom.className = "flex flex-col gap-1";
                    const topRow = document.createElement("div");
                    const contentPreview = document.createElement("div");

                    // Create navigation button
                    const navigateButton = document.createElement("button");
                    navigateButton.textContent = "Visit";
                    navigateButton.className = "mr-[4px] border border-primary bg-primary text-primary-foreground hover:bg-primary/90 py-1 px-2 cursor-pointer rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
                    navigateButton.addEventListener("click", () => {
                        navigateToFile(importedNode);
                    });

                    // Create a span element for the tooltip
                    const navigateSpan = document.createElement("span");
                    navigateSpan.textContent = `Found import: ${match ? match[1] : ""}`;

                    // Create content review
                    contentPreview.className = "max-w-[300px] max-h-[200px] overflow-auto bg-primary/10 p-2 rounded-md";
                    contentPreview.textContent = "Loading..."; // Initial loading state

                    importedNode.getContent()
                        .then(importedNodeContent => {
                            console.log("Imported node content:", importedNodeContent);
                            contentPreview.textContent = ""; // Clear "Loading..." text
                            const pre = document.createElement('pre');
                            if (!importedNodeContent) {
                                contentPreview.textContent = "No content available."; // Display error message
                                return;
                            }

                            // Optionally if there is a colon we have to filter the content according to the section names
                            if (match && match[2]) {
                                // Get next line
                                const { text: nextLineText } = view.state.doc.lineAt(to + 1);
                                const targetSections = nextLineText.split(",").map(section => section.trim());
                                // console.log("Target sections:", targetSections);
                                if (targetSections.length === 1 && targetSections[0] === "") {
                                    importedNodeContent = "Select at least one section for import!";
                                } else {
                                    // console.log("Sections at next line:", targetSections);
                                    importedNodeContent = filterImportedSections(importedNodeContent, targetSections);
                                }
                            }

                            pre.textContent = importedNodeContent;
                            contentPreview.appendChild(pre);
                        })
                        .catch(error => {
                            console.error("Error fetching content:", error);
                            contentPreview.textContent = "Error loading content."; // Display error message
                        });

                    // Build the dom element
                    topRow.appendChild(navigateButton);
                    topRow.appendChild(navigateSpan);
                    dom.appendChild(topRow);
                    dom.appendChild(contentPreview);

                    return { dom };
                },
            };
        }
    }

    return null;
});

const filterImportedSections = (importedNodeContent: string, targetSections: string[]) => {
    // Get subsections
    const contentLines = importedNodeContent.trim().split("\n");
    console.log("Content lines:", contentLines);
    const subsections = [];

    let start = 0;
    let end = 0;
    for (const [index, line] of contentLines.entries()) {
        if (index === contentLines.length - 1) {
            subsections.push(contentLines.slice(start, index + 1).join("\n"));
        }
        if (line === "") {
            if (start !== end) {
                subsections.push(contentLines.slice(start, end).join("\n"));
                end++;
                start = end;
            } else {
                start++;
                end++;
            }
        } else {
            end++;
        }
    }
    // console.log("Subsections:", subsections);
    const filteredSubsections = subsections.filter(subsection => {
        const sectionName = subsection.split(":")[0]
        return targetSections.includes(sectionName);
    }).join("\n\n");
    return filteredSubsections || "No matching sections found to preview!";
}

export default importHoverTooltip;