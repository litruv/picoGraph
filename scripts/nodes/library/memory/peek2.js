import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads a 16-bit little-endian value using peek2.
 */
export const memoryPeek2Node = createNodeModule(
  {
    id: "memory_peek2",
    title: "Peek16 Memory",
    category: "Memory",
    description: "Read a 16-bit little-endian value from base RAM.",
    searchTags: ["peek2", "memory", "read", "16-bit"],
    inputs: [
      {
        id: "address",
        name: "Address",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
    ],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const address = resolveValueInput("address", "0");
      return `peek2(${address})`;
    },
  }
);
