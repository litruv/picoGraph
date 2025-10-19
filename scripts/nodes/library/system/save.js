import { createNodeModule } from "../../nodeTypes.js";

/**
 * Persists the active cartridge to disk.
 */
export const saveNode = createNodeModule(
  {
    id: "system_save",
    title: "Save Cartridge",
    category: "System",
    description: "Save the current cartridge to the specified filename.",
    searchTags: ["save", "cartridge", "system", "cart"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "filename",
        name: "Filename",
        direction: "input",
        kind: "string",
        defaultValue: "cart.p8",
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const filename = resolveValueInput("filename", '""');
      const lines = [`${indent(indentLevel)}save(${filename})`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
