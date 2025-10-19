import { createNodeModule } from "../../nodeTypes.js";

/**
 * Prints to the host console or files for debugging utilities.
 */
export const printhNode = createNodeModule(
  {
    id: "system_printh",
    title: "Print Host",
    category: "System",
    description:
      "Print a string to the host console or optionally to a file or clipboard.",
    searchTags: ["printh", "print", "debug", "file", "system"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "text",
        name: "Text",
        direction: "input",
        kind: "string",
        defaultValue: "debug",
      },
      { id: "filename", name: "Filename", direction: "input", kind: "string" },
      {
        id: "overwrite",
        name: "Overwrite",
        direction: "input",
        kind: "boolean",
        defaultValue: false,
      },
      {
        id: "save_to_desktop",
        name: "Save to Desktop",
        direction: "input",
        kind: "boolean",
        defaultValue: false,
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const text = resolveValueInput("text", '""');
      const filename = resolveValueInput("filename", "nil");
      const overwrite = resolveValueInput("overwrite", "false");
      const saveToDesktop = resolveValueInput("save_to_desktop", "false");

      const args = [text];
      const hasFilename = filename !== "nil";
      if (hasFilename) {
        args.push(filename);
        const includeOverwrite =
          overwrite !== "false" || saveToDesktop !== "false";
        if (includeOverwrite) {
          args.push(overwrite);
          if (saveToDesktop !== "false") {
            args.push(saveToDesktop);
          }
        }
      }

      const lines = [`${indent(indentLevel)}printh(${args.join(", ")})`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
