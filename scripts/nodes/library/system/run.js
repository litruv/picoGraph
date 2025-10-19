import { createNodeModule } from "../../nodeTypes.js";

/**
 * Restarts the current program from the beginning.
 */
export const runNode = createNodeModule(
  {
    id: "system_run",
    title: "Run",
    category: "System",
    description:
      "Restart the program optionally providing a parameter string accessible via stat(6).",
    searchTags: ["run", "launch", "cartridge", "system"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "param", name: "Param String", direction: "input", kind: "string" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const OMIT = "__pg_omit__";
      const param = resolveValueInput("param", OMIT);
      const call = param === OMIT ? "run()" : `run(${param})`;
      const lines = [`${indent(indentLevel)}${call}`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
