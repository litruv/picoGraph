import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads bytes from base RAM using PICO-8's peek helper.
 */
export const memoryPeekNode = createNodeModule(
  {
    id: "memory_peek",
    title: "Peek Memory",
    category: "Memory",
    description: "Read a byte or sequence of bytes from base RAM.",
    searchTags: ["peek", "memory", "read"],
    inputs: [
      {
        id: "address",
        name: "Address",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "count",
        name: "Count",
        direction: "input",
        kind: "number",
        description: "Optional number of bytes to read",
      },
    ],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const OMIT = "__pg_omit__";
      const address = resolveValueInput("address", "0");
      const count = resolveValueInput("count", OMIT);
      if (count === OMIT) {
        return `peek(${address})`;
      }
      return `peek(${address}, ${count})`;
    },
  }
);
