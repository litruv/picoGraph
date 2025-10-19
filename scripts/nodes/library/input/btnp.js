import { createNodeModule } from "../../nodeTypes.js";

/**
 * Reads button press transitions using BTNP.
 */
export const btnpNode = createNodeModule(
  {
    id: "input_btnp",
    title: "Button Press",
    category: "Input",
    description:
      "Detect when a button is initially pressed or repeats using BTNP.",
    searchTags: ["btnp", "input", "button", "press", "repeat"],
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
        return "btnp()";
      }

      if (button === OMIT) {
        return `btnp(nil, ${player})`;
      }

      if (player === OMIT) {
        return `btnp(${button})`;
      }

      return `btnp(${button}, ${player})`;
    },
  }
);
