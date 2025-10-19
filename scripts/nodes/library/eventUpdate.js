import { createNodeModule } from "../nodeTypes.js";

/**
 * @type {import('../nodeTypes.js').NodeModule}
 */
export const eventUpdateNode = createNodeModule(
  {
    id: "event_update",
    title: "Event Update",
    category: "Events",
    description: "Called once per update",
    searchTags: ["update", "loop", "frame", "tick"],
    unique: true,
    inputs: [],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    isEntryPoint: true,
    eventName: "_update",
    emitExec: ({ emitNextExec }) => emitNextExec("exec_out"),
  }
);
