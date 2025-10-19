import { devkitConfigNode } from "./devkitConfig.js";
import { devkitInputReadNode } from "./devkitInputRead.js";
import { devkitInputWriteNode } from "./devkitInputWrite.js";

/**
 * Node modules covering devkit helpers.
 */
export const devkitNodes = [
  devkitConfigNode,
  devkitInputReadNode,
  devkitInputWriteNode,
];

/**
 * Checklist tracking coverage of devkit helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const devkitFunctionChecklist = [
  { function: "DEVKIT_CONFIG", nodeId: "devkit_config", implemented: true },
  { function: "DEVKIT_INPUT (read)", nodeId: "devkit_input_read", implemented: true },
  { function: "DEVKIT_INPUT (write)", nodeId: "devkit_input_write", implemented: true },
];
