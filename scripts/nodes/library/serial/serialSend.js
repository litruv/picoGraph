import { createNodeModule } from "../../nodeTypes.js";

/**
 * Sends data over a serial channel using serial().
 */
export const serialSendNode = createNodeModule(
  {
    id: "serial_send",
    title: "Serial Send",
    category: "IO",
    description: "Transmit a string to a serial channel.",
    searchTags: ["serial", "io", "send"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "channel",
        name: "Channel",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "message",
        name: "Message",
        direction: "input",
        kind: "string",
        defaultValue: "",
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const channel = resolveValueInput("channel", "0");
      const message = resolveValueInput("message", '""');
      const line = `${indent(indentLevel)}serial(${channel}, ${message})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
