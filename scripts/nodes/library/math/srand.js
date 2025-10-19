import { createNodeModule } from "../../nodeTypes.js";

/**
 * Seeds the random number generator using srand.
 */
export const mathSrandNode = createNodeModule(
  {
    id: "math_srand",
    title: "Seed Random",
    category: "Math",
    description: "Set the random number generator seed.",
    searchTags: ["srand", "random", "seed", "math"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "value", name: "Seed", direction: "input", kind: "number" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const value = resolveValueInput("value", "0");
      const line = `${indent(indentLevel)}srand(${value})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
