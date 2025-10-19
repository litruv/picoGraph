import { createNodeModule } from "../../nodeTypes.js";

const DEFAULT_PLAYER_VALUE = "0";

/**
 * Normalizes the stored player property to a valid controller index.
 *
 * @param {unknown} value Raw inspector value.
 * @returns {number}
 */
const resolvePlayerIndex = (value) => {
  const numeric = Number.parseInt(
    typeof value === "string" ? value : String(value ?? DEFAULT_PLAYER_VALUE),
    10
  );
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  if (numeric > 7) {
    return 7;
  }
  return numeric;
};

const BUTTON_OPTIONS = [
  { value: "0", label: "Left" },
  { value: "1", label: "Right" },
  { value: "2", label: "Up" },
  { value: "3", label: "Down" },
  { value: "4", label: "O" },
  { value: "5", label: "X" },
];

const BUTTON_VALUE_SET = new Set(BUTTON_OPTIONS.map((option) => option.value));

const DEFAULT_BUTTON_VALUE = BUTTON_OPTIONS[0]?.value ?? "0";

/**
 * Normalizes button property values to a valid BTN index represented as a string.
 *
 * @param {unknown} value Raw inspector value.
 * @returns {string}
 */
const resolveButtonValue = (value) => {
  const numeric = Number.parseInt(
    typeof value === "string" ? value : String(value ?? DEFAULT_BUTTON_VALUE),
    10
  );

  const candidate = Number.isFinite(numeric) ? String(numeric) : DEFAULT_BUTTON_VALUE;
  if (BUTTON_VALUE_SET.has(candidate)) {
    return candidate;
  }
  return DEFAULT_BUTTON_VALUE;
};

const PLAYER_OPTIONS = [
  { value: "0", label: "Player 0 (Cursors / Z X)" },
  { value: "1", label: "Player 1 (SFED / Tab Q W A)" },
  { value: "2", label: "Player 2" },
  { value: "3", label: "Player 3" },
  { value: "4", label: "Player 4" },
  { value: "5", label: "Player 5" },
  { value: "6", label: "Player 6" },
  { value: "7", label: "Player 7" },
];

/**
 * Evaluates whether the configured button is currently pressed.
 */
export const controllerButtonsNode = createNodeModule(
  {
    id: "input_button_constants",
    title: "Named Button",
    category: "Input",
    description:
      "Read a specific controller button with a dropdown selector and optional player override.",
    searchTags: [
      "button",
      "controller",
      "dpad",
      "input",
      "player",
      "named",
      "press",
    ],
    inputs: [
      {
        id: "button",
        name: "Button",
        direction: "input",
        kind: "number",
        description: "Optional button index override",
      },
      {
        id: "player",
        name: "Player",
        direction: "input",
        kind: "number",
        description: "Optional player index override",
      },
    ],
    outputs: [
      {
        id: "pressed",
        name: "Pressed",
        direction: "output",
        kind: "boolean",
      },
    ],
    properties: [
      {
        key: "button",
        label: "Button",
        type: "enum",
        defaultValue: DEFAULT_BUTTON_VALUE,
        options: BUTTON_OPTIONS,
      },
      {
        key: "player",
        label: "Default Player",
        type: "enum",
        defaultValue: DEFAULT_PLAYER_VALUE,
        options: PLAYER_OPTIONS,
      },
    ],
    initializeProperties: (properties) => {
      properties.button = resolveButtonValue(properties.button);
      const normalizedPlayer = resolvePlayerIndex(properties.player);
      properties.player = String(normalizedPlayer);
      const buttonInlineKey = "pin:button";
      const playerInlineKey = "pin:player";
      const numericButton = Number.parseInt(properties.button, 10);
      const numericPlayer = normalizedPlayer;
      properties[buttonInlineKey] = Number.isFinite(numericButton)
        ? numericButton
        : 0;
      properties[playerInlineKey] = Number.isFinite(numericPlayer)
        ? numericPlayer
        : 0;
    },
    onPropertiesChanged: (properties) => {
      properties.button = resolveButtonValue(properties.button);
      const normalizedPlayer = resolvePlayerIndex(properties.player);
      properties.player = String(normalizedPlayer);
      const buttonInlineKey = "pin:button";
      const playerInlineKey = "pin:player";
      const numericButton = Number.parseInt(properties.button, 10);
      const numericPlayer = normalizedPlayer;
      properties[buttonInlineKey] = Number.isFinite(numericButton)
        ? numericButton
        : 0;
      properties[playerInlineKey] = Number.isFinite(numericPlayer)
        ? numericPlayer
        : 0;
    },
  },
  {
    evaluateValue: ({ node, resolveValueInput, formatLiteral }) => {
      const buttonValue = resolveButtonValue(node.properties.button);
      const parsedButton = Number.parseInt(buttonValue, 10);
      const buttonIndex = Number.isFinite(parsedButton) ? parsedButton : 0;
      const fallbackButton = formatLiteral("number", buttonIndex);
      const buttonInput = resolveValueInput("button", fallbackButton);

      const fallbackPlayer = formatLiteral(
        "number",
        resolvePlayerIndex(node.properties.player)
      );
      const playerInput = resolveValueInput("player", fallbackPlayer);

      return `btn(${buttonInput}, ${playerInput})`;
    },
  }
);
