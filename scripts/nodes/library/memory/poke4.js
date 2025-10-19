import { createNodeModule } from "../../nodeTypes.js";

/**
 * Writes a 32-bit little-endian value using poke4.
 */
export const memoryPoke4Node = createNodeModule(
  {
    id: "memory_poke4",
    title: "Poke32 Memory",
    category: "Memory",
    description: "Write a 32-bit little-endian value to base RAM.",
    searchTags: ["poke4", "memory", "write", "32-bit"],
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
      const line = `${indent(indentLevel)}poke4(${address}, ${value})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
