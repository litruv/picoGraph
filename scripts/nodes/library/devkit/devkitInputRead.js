import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads values from devkit-provided inputs via devkit_input().
 */
export const devkitInputReadNode = createNodeModule(
  {
    id: "devkit_input_read",
    title: "Devkit Input Read",
    category: "Devkit",
    description: "Fetch the value of a devkit input index.",
    searchTags: ["devkit", "input", "read"],
    inputs: [
      {
        id: "index",
        name: "Index",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
    ],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "any" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const index = resolveValueInput("index", "0");
      return `devkit_input(${index})`;
    },
  }
);
