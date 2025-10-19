import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads the state of a PICO-8 button using BTN.
 */
export const btnNode = createNodeModule(
  {
    id: "input_btn",
    title: "Button State",
    category: "Input",
    description: "Read the current pressed state for a controller button.",
    searchTags: ["btn", "input", "button", "press"],
    inputs: [
      {
        id: "button",
        name: "Button",
        direction: "input",
        kind: "number",
        description: "Button index or glyph code",
      },
      {
        id: "player",
        name: "Player",
        direction: "input",
        kind: "number",
        description: "Optional player index",
      },
    ],
    outputs: [
      { id: "value", name: "Pressed", direction: "output", kind: "boolean" },
    ],
    properties: [],
  },
  {
    evaluateValue: ({ resolveValueInput }) => {
      const OMIT = "__pg_omit__";
      const button = resolveValueInput("button", OMIT);
      const player = resolveValueInput("player", OMIT);

      if (button === OMIT && player === OMIT) {
        return "btn()";
      }

      if (button === OMIT) {
        return `btn(nil, ${player})`;
      }

      if (player === OMIT) {
        return `btn(${button})`;
      }

      return `btn(${button}, ${player})`;
    },
  }
);
