import { createNodeModule } from "../../nodeTypes.js";

/**
 * Writes a raw table entry using rawset().
 */
export const luaRawSetNode = createNodeModule(
  {
    id: "lua_rawset",
    title: "Raw Set",
    category: "Lua",
    description: "Assign a table entry without metamethods using rawset().",
    searchTags: ["rawset", "table", "lua"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "table", name: "Table", direction: "input", kind: "table" },
      { id: "key", name: "Key", direction: "input", kind: "any" },
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
      const key = resolveValueInput("key", "nil");
      const value = resolveValueInput("value", "nil");
      const line = `${indent(indentLevel)}rawset(${tableValue}, ${key}, ${value})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
