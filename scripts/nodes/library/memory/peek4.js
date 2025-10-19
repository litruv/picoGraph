import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads a 32-bit little-endian value using peek4.
 */
export const memoryPeek4Node = createNodeModule(
  {
    id: "memory_peek4",
    title: "Peek32 Memory",
    category: "Memory",
    description: "Read a 32-bit little-endian value from base RAM.",
    searchTags: ["peek4", "memory", "read", "32-bit"],
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
      return `peek4(${address})`;
    },
  }
);
