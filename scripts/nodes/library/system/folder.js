import { createNodeModule } from "../../nodeTypes.js";

/**
 * Opens the cartridge folder on the host operating system.
 */
export const folderNode = createNodeModule(
  {
    id: "system_folder",
    title: "Open Folder",
    category: "System",
    description: "Open the cartridge folder on the host operating system.",
    searchTags: ["folder", "system", "directory", "open"],
    inputs: [{ id: "exec_in", name: "Exec", direction: "input", kind: "exec" }],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, emitNextExec }) => {
      const lines = [`${indent(indentLevel)}folder()`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
