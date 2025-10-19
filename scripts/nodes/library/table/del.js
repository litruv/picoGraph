import { createNodeModule } from "../../nodeTypes.js";

/**
 * Removes the first matching value from a table using PICO-8's del helper.
 */
export const tableDelNode = createNodeModule(
  {
    id: "table_del",
    title: "Delete From Table",
    category: "Tables",
    description: "Remove the first matching value from a table.",
    searchTags: ["del", "table", "remove", "delete"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "table", name: "Table", direction: "input", kind: "table" },
      { id: "value", name: "Value", direction: "input", kind: "any" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const tableValue = resolveValueInput("table", "{}");
      const value = resolveValueInput("value", "nil");
      const line = `${indent(indentLevel)}del(${tableValue}, ${value})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
