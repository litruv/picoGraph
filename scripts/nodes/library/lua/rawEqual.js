import { createNodeModule } from "../../nodeTypes.js";

/**
 * Compares two values using rawequal().
 */
export const luaRawEqualNode = createNodeModule(
  {
    id: "lua_rawequal",
    title: "Raw Equal",
    category: "Lua",
    description: "Compare values without metamethods using rawequal().",
    searchTags: ["rawequal", "compare", "lua"],
    inputs: [
      { id: "a", name: "A", direction: "input", kind: "any" },
      { id: "b", name: "B", direction: "input", kind: "any" },
    ],
    outputs: [
      { id: "equal", name: "Equal", direction: "output", kind: "boolean" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const a = resolveValueInput("a", "nil");
      const b = resolveValueInput("b", "nil");
      return `rawequal(${a}, ${b})`;
    },
  }
);
