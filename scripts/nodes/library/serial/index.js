import { serialSendNode } from "./serialSend.js";
import { serialReceiveNode } from "./serialReceive.js";

/**
 * Node modules covering serial helpers.
 */
export const serialNodes = [serialSendNode, serialReceiveNode];

/**
 * Checklist tracking coverage of serial helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const serialFunctionChecklist = [
  { function: "SERIAL (send)", nodeId: "serial_send", implemented: true },
  { function: "SERIAL (receive)", nodeId: "serial_receive", implemented: true },
];
