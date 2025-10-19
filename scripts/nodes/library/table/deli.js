import { createNodeModule } from "../../nodeTypes.js";

/**
 * Removes a table entry at a given index using PICO-8's deli helper.
 */
export const tableDeliNode = createNodeModule(
  {
    id: "table_deli",
    title: "Delete Table Index",
    category: "Tables",
    description: "Remove and return the value at an index, or the last entry when omitted.",
    searchTags: ["deli", "table", "remove", "pop"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "table", name: "Table", direction: "input", kind: "table" },
      {
        id: "index",
        name: "Index",
        direction: "input",
        kind: "number",
        description: "Optional index to remove",
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const OMIT = "__pg_omit__";
      const tableValue = resolveValueInput("table", "{}");
      const index = resolveValueInput("index", OMIT);
      const args = [tableValue];
      if (index !== OMIT) {
        args.push(index);
      }
      const line = `${indent(indentLevel)}deli(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
