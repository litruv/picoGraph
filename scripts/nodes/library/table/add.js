import { createNodeModule } from "../../nodeTypes.js";

/**
 * Adds a value to a table using PICO-8's add helper.
 */
export const tableAddNode = createNodeModule(
  {
    id: "table_add",
    title: "Add To Table",
    category: "Tables",
    description: "Append a value to a table, optionally inserting at an index.",
    searchTags: ["add", "table", "insert", "append", "push"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "table", name: "Table", direction: "input", kind: "table" },
      { id: "value", name: "Value", direction: "input", kind: "any" },
      {
        id: "index",
        name: "Index",
        direction: "input",
        kind: "number",
        description: "Optional insertion index",
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
      const value = resolveValueInput("value", "nil");
      const index = resolveValueInput("index", OMIT);

      const args = [tableValue, value];
      if (index !== OMIT) {
        args.push(index);
      }

      const line = `${indent(indentLevel)}add(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
