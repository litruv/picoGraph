import { createNodeModule } from "../../nodeTypes.js";

/**
 * Yields from within a coroutine using coroutine.yield().
 */
export const luaCoroutineYieldNode = createNodeModule(
  {
    id: "lua_coroutine_yield",
    title: "Coroutine Yield",
    category: "Lua",
    description: "Yield execution from within a coroutine and optionally return values.",
    searchTags: ["coroutine", "yield", "lua"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "value1",
        name: "Value 1",
        direction: "input",
        kind: "any",
        description: "Optional first value yielded to the caller",
      },
      {
        id: "value2",
        name: "Value 2",
        direction: "input",
        kind: "any",
        description: "Optional second value yielded to the caller",
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
      const value1 = resolveValueInput("value1", OMIT);
      const value2 = resolveValueInput("value2", OMIT);
      const args = [];
      if (value1 !== OMIT) {
        args.push(value1);
      }
      if (value2 !== OMIT) {
        args.push(value2);
      }
      const call = args.length
        ? `${indent(indentLevel)}coroutine.yield(${args.join(", ")})`
        : `${indent(indentLevel)}coroutine.yield()`;
      return [call, ...emitNextExec("exec_out")];
    },
  }
);
