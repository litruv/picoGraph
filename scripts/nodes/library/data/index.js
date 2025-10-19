import { cartdataNode } from "./cartdata.js";
import { dsetNode } from "./dset.js";
import { dgetNode } from "./dget.js";

/**
 * All data persistence node modules backed by PICO-8 helpers.
 */
export const dataNodes = [cartdataNode, dsetNode, dgetNode];

/**
 * Checklist tracking coverage of documented cart data helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const dataFunctionChecklist = [
  { function: "CARTDATA", nodeId: "data_cartdata", implemented: true },
  { function: "DSET", nodeId: "data_dset", implemented: true },
  { function: "DGET", nodeId: "data_dget", implemented: true },
];
