import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reports a coroutine's status via coroutine.status().
 */
export const luaCoroutineStatusNode = createNodeModule(
  {
    id: "lua_coroutine_status",
    title: "Coroutine Status",
    category: "Lua",
    description: "Retrieve a coroutine's status string using coroutine.status().",
    searchTags: ["coroutine", "status", "lua"],
    inputs: [
      {
        id: "coroutine",
        name: "Coroutine",
        direction: "input",
        kind: "any",
      },
    ],
    outputs: [
      { id: "status", name: "Status", direction: "output", kind: "string" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const target = resolveValueInput("coroutine", "nil");
      return `coroutine.status(${target})`;
    },
  }
);
