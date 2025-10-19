import { createNodeModule } from "../../nodeTypes.js";

/**
 * Stops the cart and optionally prints a message to the console.
 */
export const stopNode = createNodeModule(
  {
    id: "system_stop",
    title: "Stop",
    category: "System",
    description: "Stop the current cart and optionally print a message.",
    searchTags: ["stop", "halt", "exit", "system"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "message", name: "Message", direction: "input", kind: "string" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const OMIT = "__pg_omit__";
      const message = resolveValueInput("message", OMIT);
      const call = message === OMIT ? "stop()" : `stop(${message})`;
      const lines = [`${indent(indentLevel)}${call}`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
