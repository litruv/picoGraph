import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reboots PICO-8, returning to a fresh command prompt.
 */
export const rebootNode = createNodeModule(
  {
    id: "system_reboot",
    title: "Reboot",
    category: "System",
    description: "Reboot the virtual machine to begin a new project.",
    searchTags: ["reboot", "restart", "system", "cart"],
    inputs: [{ id: "exec_in", name: "Exec", direction: "input", kind: "exec" }],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, emitNextExec }) => {
      const lines = [`${indent(indentLevel)}reboot()`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
