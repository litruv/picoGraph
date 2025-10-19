import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads a value from a GPIO pin using gpio().
 */
export const gpioReadNode = createNodeModule(
  {
    id: "gpio_read",
    title: "GPIO Read",
  category: "IO",
    description: "Fetch the current value of a GPIO pin.",
    searchTags: ["gpio", "hardware", "input"],
    inputs: [
      {
        id: "index",
        name: "Pin",
        direction: "input",
        kind: "number",
        defaultValue: 0,
      },
    ],
    outputs: [
      { id: "value", name: "Value", direction: "output", kind: "number" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const pin = resolveValueInput("index", "0");
      return `gpio(${pin})`;
    },
  }
);
