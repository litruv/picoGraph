import { createNodeModule } from "../../nodeTypes.js";

/**
 * Applies a metatable to a table via setmetatable().
 */
export const luaSetMetatableNode = createNodeModule(
  {
    id: "lua_setmetatable",
    title: "Set Metatable",
    category: "Lua",
    description: "Assign a metatable to a table using setmetatable().",
    searchTags: ["setmetatable", "metatable", "lua"],
    inputs: [
      { id: "table", name: "Table", direction: "input", kind: "table" },
      {
        id: "metatable",
        name: "Metatable",
        direction: "input",
        kind: "table",
        defaultValue: "nil",
      },
    ],
    outputs: [
      { id: "table_out", name: "Table", direction: "output", kind: "table" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const tableValue = resolveValueInput("table", "{}");
      const metatable = resolveValueInput("metatable", "nil");
      return `setmetatable(${tableValue}, ${metatable})`;
    },
  }
);
