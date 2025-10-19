import { createNodeModule } from "../../nodeTypes.js";

/**
 * Restores draw state values such as palette and camera to their defaults.
 */
export const resetNode = createNodeModule(
  {
    id: "system_reset",
    title: "Reset Draw State",
    category: "System",
    description:
      "Reset memory range 0x5f00..0x5f7f, restoring draw state defaults.",
    searchTags: ["reset", "clear", "system", "state"],
    inputs: [{ id: "exec_in", name: "Exec", direction: "input", kind: "exec" }],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, emitNextExec }) => {
      const lines = [`${indent(indentLevel)}reset()`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
