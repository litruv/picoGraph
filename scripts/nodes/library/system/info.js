import { createNodeModule } from "../../nodeTypes.js";

/**
 * Prints cartridge diagnostics to the console.
 */
export const infoNode = createNodeModule(
  {
    id: "system_info",
    title: "Cartridge Info",
    category: "System",
    description:
      "Print information about the cartridge including size and token counts.",
    searchTags: ["info", "memory", "stats", "system"],
    inputs: [{ id: "exec_in", name: "Exec", direction: "input", kind: "exec" }],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, emitNextExec }) => {
      const lines = [`${indent(indentLevel)}info()`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
