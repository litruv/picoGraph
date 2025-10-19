import { createNodeModule } from "../nodeTypes.js";

/**
 * Lifecycle entry triggered once when the cart boots.
 * @type {import('../nodeTypes.js').NodeModule}
 */
export const eventInitNode = createNodeModule(
  {
    id: "event_start",
    title: "Event Init",
    category: "Events",
    description: "Called once on cart startup.",
    searchTags: ["start", "init", "boot", "lifecycle"],
    unique: true,
    inputs: [],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    isEntryPoint: true,
    eventName: "_init",
    emitExec: ({ emitNextExec }) => emitNextExec("exec_out"),
  }
);
