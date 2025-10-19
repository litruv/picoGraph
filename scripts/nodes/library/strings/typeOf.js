import { createNodeModule } from "../../nodeTypes.js";

/**
 * Returns the type of a value using type.
 */
export const stringTypeNode = createNodeModule(
  {
    id: "string_type",
    title: "Type Of",
    category: "Strings",
    description: "Return the type name of a value using TYPE().",
    searchTags: ["type", "string", "introspection"],
    inputs: [{ id: "value", name: "Value", direction: "input", kind: "any" }],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "string" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const value = resolveValueInput("value", "nil");
      return `type(${value})`;
    },
  }
);
