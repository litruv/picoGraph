import { createNodeModule } from "../nodeTypes.js";

/**
 * Exposes the current value of a variable.
 */
export const getVariableNode = createNodeModule(
  {
    id: "get_var",
    title: "Get Variable",
    category: "Logic",
    description: "Expose the current value of a variable.",
    searchTags: ["get", "read", "variable", "access"],
    inputs: [],
    outputs: [{ id: "value", name: "Value", direction: "output", kind: "any" }],
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
    evaluateValue: ({ node, sanitizeIdentifier }) => {
      const name = sanitizeIdentifier(String(node.properties.name ?? "var"));
      return name;
    },
  }
);
