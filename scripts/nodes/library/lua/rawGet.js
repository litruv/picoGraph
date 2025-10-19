import { createNodeModule } from "../../nodeTypes.js";

/**
 * Retrieves a raw table entry using rawget().
 */
export const luaRawGetNode = createNodeModule(
  {
    id: "lua_rawget",
    title: "Raw Get",
    category: "Lua",
    description: "Access a table entry without metamethods using rawget().",
    searchTags: ["rawget", "table", "lua"],
    inputs: [
      { id: "table", name: "Table", direction: "input", kind: "table" },
      { id: "key", name: "Key", direction: "input", kind: "any" },
    ],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "any" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const tableValue = resolveValueInput("table", "{}");
      const key = resolveValueInput("key", "nil");
      return `rawget(${tableValue}, ${key})`;
    },
  }
);
