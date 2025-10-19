import { createNodeModule } from "../../nodeTypes.js";

/**
 * Queries system status values exposed through stat().
 */
export const statNode = createNodeModule(
  {
    id: "system_stat",
    title: "System Status",
    category: "System",
    description: "Fetch a system status value using the stat(index) helper.",
    searchTags: ["stat", "status", "system", "metrics"],
    inputs: [
      {
        id: "index",
        name: "Index",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
    ],
    outputs: [{ id: "value", name: "Value", direction: "output", kind: "any" }],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const index = resolveValueInput("index", "0");
      return `stat(${index})`;
    },
  }
);
