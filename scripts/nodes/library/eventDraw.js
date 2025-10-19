import { createNodeModule } from "../nodeTypes.js";

/**
 * Lifecycle event triggered once per visible frame.
 * @type {import('../nodeTypes.js').NodeModule}
 */
export const eventDrawNode = createNodeModule(
  {
    id: "event_draw",
    title: "Event Draw",
    category: "Events",
    description: "Called once per visible frame.",
    searchTags: ["draw", "render", "frame", "loop"],
    unique: true,
    inputs: [],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    isEntryPoint: true,
    eventName: "_draw",
    emitExec: ({ emitNextExec }) => emitNextExec("exec_out"),
  }
);
