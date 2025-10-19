import { createNodeModule } from "../../nodeTypes.js";

/**
 * Resumes a coroutine and exposes the success flag and first result.
 */
export const luaCoroutineResumeNode = createNodeModule(
  {
    id: "lua_coroutine_resume",
    title: "Coroutine Resume",
    category: "Lua",
    description:
      "Resume a coroutine and capture the success flag alongside the first returned value.",
    searchTags: ["coroutine", "resume", "lua"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "coroutine",
        name: "Coroutine",
        direction: "input",
        kind: "any",
      },
      {
        id: "arg1",
        name: "Arg 1",
        direction: "input",
        kind: "any",
        description: "Optional first value passed to coroutine",
      },
      {
        id: "arg2",
        name: "Arg 2",
        direction: "input",
        kind: "any",
        description: "Optional second value passed to coroutine",
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
      {
        id: "success",
        name: "Success",
        direction: "output",
        kind: "boolean",
      },
      {
        id: "result",
        name: "Result",
        direction: "output",
        kind: "any",
      },
    ],
    properties: [],
  },
  {
    emitExec: ({
      node,
      indent,
      indentLevel,
      resolveValueInput,
      sanitizeIdentifier,
      emitNextExec,
    }) => {
      const OMIT = "__pg_omit__";
      const target = resolveValueInput("coroutine", "nil");
      const arg1 = resolveValueInput("arg1", OMIT);
      const arg2 = resolveValueInput("arg2", OMIT);
      const args = [target];
      if (arg1 !== OMIT) {
        args.push(arg1);
      }
      if (arg2 !== OMIT) {
        args.push(arg2);
      }
      const successName = sanitizeIdentifier(`__pg_${node.id}_co_success`);
      const resultName = sanitizeIdentifier(`__pg_${node.id}_co_result`);
      const line = `${indent(indentLevel)}local ${successName}, ${resultName} = coroutine.resume(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
    evaluateValue: ({ node, pinId, sanitizeIdentifier }) => {
      const successName = sanitizeIdentifier(`__pg_${node.id}_co_success`);
      const resultName = sanitizeIdentifier(`__pg_${node.id}_co_result`);
      if (pinId === "success") {
        return successName;
      }
      if (pinId === "result") {
        return resultName;
      }
      return "nil";
    },
  }
);
