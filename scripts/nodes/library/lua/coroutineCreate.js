import { createNodeModule } from "../../nodeTypes.js";

/**
 * Creates a coroutine from a function using coroutine.create().
 */
export const luaCoroutineCreateNode = createNodeModule(
  {
    id: "lua_coroutine_create",
    title: "Coroutine Create",
    category: "Lua",
    description: "Wrap a function in a coroutine via coroutine.create().",
    searchTags: ["coroutine", "create", "lua"],
    inputs: [
      {
        id: "fn",
        name: "Function",
        direction: "input",
        kind: "any",
        description: "Function to run inside the coroutine",
      },
    ],
    outputs: [
      {
        id: "coroutine",
        name: "Coroutine",
        direction: "output",
        kind: "any",
      },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const fn = resolveValueInput("fn", "function() end");
      return `coroutine.create(${fn})`;
    },
  }
);
