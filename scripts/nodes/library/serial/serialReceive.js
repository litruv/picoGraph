import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads pending data from a serial channel using serial().
 */
export const serialReceiveNode = createNodeModule(
  {
    id: "serial_receive",
    title: "Serial Receive",
    category: "IO",
    description: "Poll a serial channel for the next message.",
    searchTags: ["serial", "io", "receive"],
    inputs: [
      {
        id: "channel",
        name: "Channel",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
    ],
    outputs: [
      { id: "message", name: "Message", direction: "output", kind: "any" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const channel = resolveValueInput("channel", "0");
      return `serial(${channel})`;
    },
  }
);
