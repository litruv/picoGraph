import { createNodeModule } from "../nodeTypes.js";

/**
 * Invokes a custom event by reference.
 * @type {import('../nodeTypes.js').NodeModule}
 */
export const callCustomEventNode = createNodeModule(
  {
    id: "call_custom_event",
    title: "Call Custom Event",
    category: "Events",
    description: "Invokes a custom event defined elsewhere in the graph.",
    searchTags: ["event", "call", "trigger", "custom"],
    inputs: [{ id: "exec_in", name: "Exec", direction: "input", kind: "exec" }],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
    initializeProperties: (properties) => {
      properties.eventId =
        typeof properties.eventId === "string" ? properties.eventId : "";
      if (
        !properties.arguments ||
        typeof properties.arguments !== "object" ||
        Array.isArray(properties.arguments)
      ) {
        properties.arguments = {};
      }
    },
  },
  null
);
