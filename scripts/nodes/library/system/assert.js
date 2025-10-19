import { createNodeModule } from "../../nodeTypes.js";

/**
 * Stops execution when a condition is false, printing an optional message.
 */
export const assertNode = createNodeModule(
  {
    id: "system_assert",
    title: "Assert",
    category: "System",
    description:
      "Assert that a condition is true, stopping the cart when it fails.",
    searchTags: ["assert", "debug", "check", "system"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "condition",
        name: "Condition",
        direction: "input",
        kind: "boolean",
        defaultValue: true,
      },
      { id: "message", name: "Message", direction: "input", kind: "string" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const OMIT = "__pg_omit__";
      const condition = resolveValueInput("condition", "true");
      const message = resolveValueInput("message", OMIT);
      const callArgs = message === OMIT ? condition : `${condition}, ${message}`;
      const lines = [`${indent(indentLevel)}assert(${callArgs})`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
