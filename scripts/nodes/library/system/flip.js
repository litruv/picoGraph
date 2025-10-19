import { createNodeModule } from "../../nodeTypes.js";

/**
 * Performs a manual buffer flip when using a custom main loop.
 */
export const flipNode = createNodeModule(
  {
    id: "system_flip",
    title: "Flip Buffer",
    category: "System",
    description:
      "Flip the back buffer to the screen and wait for the next frame.",
    searchTags: ["flip", "sync", "frame", "system"],
    inputs: [{ id: "exec_in", name: "Exec", direction: "input", kind: "exec" }],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, emitNextExec }) => {
      const lines = [`${indent(indentLevel)}flip()`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
