import { createNodeModule } from "../nodeTypes.js";

/**
 * Defines a reusable custom event entry point.
 * @type {import('../nodeTypes.js').NodeModule}
 */
export const customEventNode = createNodeModule(
  {
    id: "custom_event",
    title: "Custom Event",
    category: "Events",
    description: "Defines a custom event that can be triggered elsewhere.",
    searchTags: ["event", "custom", "broadcast", "trigger"],
    inputs: [],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [
      {
        key: "name",
        label: "Event Name",
        type: "string",
        defaultValue: "CustomEvent",
        placeholder: "Enter event name",
      },
    ],
    initializeProperties: (properties) => {
      if (typeof properties.name !== "string" || !properties.name.trim()) {
        properties.name = "CustomEvent";
      }
      if (!Array.isArray(properties.parameters)) {
        properties.parameters = [];
      }
      const counter = Number.isFinite(properties.parameterCounter)
        ? Number(properties.parameterCounter)
        : 0;
      properties.parameterCounter = counter;
    },
  },
  {
    isEntryPoint: true,
    emitExec: ({ emitNextExec }) => emitNextExec("exec_out"),
  }
);
