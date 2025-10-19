import { btnNode } from "./btn.js";
import { btnpNode } from "./btnp.js";
import { controllerButtonsNode } from "./controllerButtons.js";

/**
 * All input-related node modules backed by PICO-8 helpers.
 */
export const inputNodes = [controllerButtonsNode, btnNode, btnpNode];

/**
 * Checklist tracking coverage of documented input helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const inputFunctionChecklist = [
  { function: "BTN", nodeId: "input_btn", implemented: true },
  { function: "BTNP", nodeId: "input_btnp", implemented: true },
];
