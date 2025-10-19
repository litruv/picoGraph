import { createNodeModule } from "../../nodeTypes.js";

/**
 * Retrieves the metatable associated with a table via getmetatable().
 */
export const luaGetMetatableNode = createNodeModule(
  {
    id: "lua_getmetatable",
    title: "Get Metatable",
    category: "Lua",
    description: "Fetch a table's metatable using getmetatable().",
    searchTags: ["getmetatable", "metatable", "lua"],
    inputs: [
      { id: "table", name: "Table", direction: "input", kind: "table" },
    ],
    outputs: [
      { id: "metatable", name: "Metatable", direction: "output", kind: "table" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const tableValue = resolveValueInput("table", "{}");
      return `getmetatable(${tableValue})`;
    },
  }
);
