import { createNodeModule } from "../../nodeTypes.js";

/**
 * Copies memory regions using memcpy.
 */
export const memoryMemcpyNode = createNodeModule(
  {
    id: "memory_memcpy",
    title: "Copy Memory",
    category: "Memory",
    description: "Copy a block of memory within base RAM.",
    searchTags: ["memcpy", "memory", "copy", "block"],
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
        id: "source",
        name: "Source",
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
      const source = resolveValueInput("source", "0");
      const length = resolveValueInput("length", "0");
      const line = `${indent(indentLevel)}memcpy(${dest}, ${source}, ${length})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
