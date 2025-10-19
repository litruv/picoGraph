import { createNodeModule } from "../nodeTypes.js";

/**
 * Assigns a value to a variable within the current scope.
 */
export const setVariableNode = createNodeModule(
  {
    id: "set_var",
    title: "Set Variable",
    category: "Logic",
    description: "Assign a value to a variable in the current scope.",
    searchTags: ["set", "assign", "variable", "write"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "value", name: "Value", direction: "input", kind: "any" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [
      {
        key: "name",
        label: "Variable Name",
        type: "string",
        defaultValue: "score",
      },
    ],
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
      const name = sanitizeIdentifier(String(node.properties.name ?? "var"));
      const value = resolveValueInput("value", "nil");
      const line = `${indent(indentLevel)}${name} = ${value}`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
