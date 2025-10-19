import { gpioReadNode } from "./gpioRead.js";
import { gpioWriteNode } from "./gpioWrite.js";

/**
 * Node modules covering GPIO helpers.
 */
export const gpioNodes = [gpioReadNode, gpioWriteNode];

/**
 * Checklist tracking coverage of GPIO read/write helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const gpioFunctionChecklist = [
  { function: "GPIO (read)", nodeId: "gpio_read", implemented: true },
  { function: "GPIO (write)", nodeId: "gpio_write", implemented: true },
];
