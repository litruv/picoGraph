import { createNodeModule } from "../../nodeTypes.js";

/**
 * Sends values to devkit inputs via devkit_input().
 */
export const devkitInputWriteNode = createNodeModule(
  {
    id: "devkit_input_write",
    title: "Devkit Input Write",
    category: "Devkit",
    description: "Push a value to a devkit input index.",
    searchTags: ["devkit", "input", "write"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "index",
        name: "Index",
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
      const index = resolveValueInput("index", "0");
      const value = resolveValueInput("value", "0");
      const line = `${indent(indentLevel)}devkit_input(${index}, ${value})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
