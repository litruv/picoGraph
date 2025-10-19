import { createNodeModule } from "../../nodeTypes.js";

/**
 * Returns the currently running coroutine via coroutine.running().
 */
export const luaCoroutineRunningNode = createNodeModule(
  {
    id: "lua_coroutine_running",
    title: "Coroutine Running",
    category: "Lua",
    description: "Access the currently running coroutine reference.",
    searchTags: ["coroutine", "running", "lua"],
    inputs: [],
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
    evaluateValue: () => "coroutine.running()",
  }
);
