import { createNodeModule } from "../../nodeTypes.js";

/**
 * Fills memory with a value using memset.
 */
export const memoryMemsetNode = createNodeModule(
  {
    id: "memory_memset",
    title: "Fill Memory",
    category: "Memory",
    description: "Fill a region of base RAM with a repeated value.",
    searchTags: ["memset", "memory", "fill"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "dest",
        name: "Dest",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "value",
        name: "Value",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "length",
        name: "Length",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const dest = resolveValueInput("dest", "0");
      const value = resolveValueInput("value", "0");
      const length = resolveValueInput("length", "0");
      const line = `${indent(indentLevel)}memset(${dest}, ${value}, ${length})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
