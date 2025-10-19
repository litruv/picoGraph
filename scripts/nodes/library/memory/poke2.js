import { createNodeModule } from "../../nodeTypes.js";

/**
 * Writes a 16-bit little-endian value using poke2.
 */
export const memoryPoke2Node = createNodeModule(
  {
    id: "memory_poke2",
    title: "Poke16 Memory",
    category: "Memory",
    description: "Write a 16-bit little-endian value to base RAM.",
    searchTags: ["poke2", "memory", "write", "16-bit"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "address",
        name: "Address",
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
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const address = resolveValueInput("address", "0");
      const value = resolveValueInput("value", "0");
      const line = `${indent(indentLevel)}poke2(${address}, ${value})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
