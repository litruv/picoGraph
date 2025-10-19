import { createNodeModule } from "../../nodeTypes.js";

/**
 * Writes a value to a GPIO pin using gpio().
 */
export const gpioWriteNode = createNodeModule(
  {
    id: "gpio_write",
    title: "GPIO Write",
  category: "IO",
    description: "Set the value for a GPIO pin.",
    searchTags: ["gpio", "hardware", "output"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "index",
        name: "Pin",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
      {
        id: "value",
        name: "Value",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const pin = resolveValueInput("index", "0");
      const value = resolveValueInput("value", "0");
      const line = `${indent(indentLevel)}gpio(${pin}, ${value})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
