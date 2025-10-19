import { createNodeModule } from "../../nodeTypes.js";

/**
 * Counts entries in a table or matching values using PICO-8's count helper.
 */
export const tableCountNode = createNodeModule(
  {
    id: "table_count",
    title: "Count Table",
    category: "Tables",
    description: "Return the number of entries in a table, optionally matching a value.",
    searchTags: ["count", "table", "length", "size"],
    inputs: [
      { id: "table", name: "Table", direction: "input", kind: "table" },
      {
        id: "value",
        name: "Value",
        direction: "input",
        kind: "any",
        description: "Optional value to match",
      },
    ],
    outputs: [
      { id: "result", name: "Count", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const OMIT = "__pg_omit__";
      const tableValue = resolveValueInput("table", "{}");
      const value = resolveValueInput("value", OMIT);
      const args = [tableValue];
      if (value !== OMIT) {
        args.push(value);
      }
      return `count(${args.join(", ")})`;
    },
  }
);
