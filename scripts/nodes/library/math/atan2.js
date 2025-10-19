import { createNodeModule } from "../../nodeTypes.js";

/**
 * Computes an angle from delta components using atan2.
 */
export const mathAtan2Node = createNodeModule(
  {
    id: "math_atan2",
    title: "Atan2",
    category: "Math",
    description:
      "Return the screenspace angle for a delta X and Y pair.",
    searchTags: ["atan2", "angle", "math", "trig"],
    inputs: [
      { id: "dx", name: "DX", direction: "input", kind: "number" },
      { id: "dy", name: "DY", direction: "input", kind: "number" },
    ],
    outputs: [
      { id: "result", name: "Result", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const dx = resolveValueInput("dx", "0");
      const dy = resolveValueInput("dy", "0");
      return `atan2(${dx}, ${dy})`;
    },
  }
);
