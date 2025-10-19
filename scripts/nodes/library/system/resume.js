import { createNodeModule } from "../../nodeTypes.js";

/**
 * Resumes execution after a stop.
 */
export const resumeNode = createNodeModule(
  {
    id: "system_resume",
    title: "Resume",
    category: "System",
    description: "Resume the program after it has been stopped.",
    searchTags: ["resume", "continue", "system", "run"],
    inputs: [{ id: "exec_in", name: "Exec", direction: "input", kind: "exec" }],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, emitNextExec }) => {
      const lines = [`${indent(indentLevel)}resume()`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
