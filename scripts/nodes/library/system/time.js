import { createNodeModule } from "../../nodeTypes.js";

/**
 * Returns the number of seconds elapsed since the cart started running.
 */
export const timeNode = createNodeModule(
  {
    id: "system_time",
    title: "Time",
    category: "System",
    description:
      "Retrieve the elapsed time in seconds since the cart launched.",
    searchTags: ["time", "seconds", "system", "elapsed"],
    inputs: [],
    outputs: [
      { id: "value", name: "Seconds", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: () => "time()",
  }
);
