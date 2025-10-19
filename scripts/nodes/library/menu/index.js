import { menuItemNode } from "./menuItem.js";

/**
 * All menu-related node modules backed by PICO-8 helpers.
 */
export const menuNodes = [menuItemNode];

/**
 * Checklist tracking coverage of documented menu helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const menuFunctionChecklist = [
  { function: "MENUITEM", nodeId: "menu_item", implemented: true },
];
