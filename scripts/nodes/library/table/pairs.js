import { createNodeModule } from "../../nodeTypes.js";

/**
 * Produces a key-value iterator using PICO-8's pairs helper.
 */
export const tablePairsNode = createNodeModule(
  {
    id: "table_pairs",
    title: "Pairs Iterator",
    category: "Tables",
    description: "Create an iterator yielding key-value pairs for a table.",
    searchTags: ["pairs", "table", "iterator", "loop"],
    inputs: [{ id: "table", name: "Table", direction: "input", kind: "table" }],
    outputs: [
      { id: "iterator", name: "Iterator", direction: "output", kind: "any" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const tableValue = resolveValueInput("table", "{}");
      return `pairs(${tableValue})`;
    },
  }
);
