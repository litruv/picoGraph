import { createNodeModule } from "../../nodeTypes.js";

/**
 * Produces a table iterator using PICO-8's all helper.
 */
export const tableAllNode = createNodeModule(
  {
    id: "table_all",
    title: "All Iterator",
    category: "Tables",
    description: "Create an iterator covering all indexed table values.",
    searchTags: ["all", "table", "iterator", "loop"],
    inputs: [{ id: "table", name: "Table", direction: "input", kind: "table" }],
    outputs: [
      { id: "iterator", name: "Iterator", direction: "output", kind: "any" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const tableValue = resolveValueInput("table", "{}");
      return `all(${tableValue})`;
    },
  }
);
