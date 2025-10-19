import { stringTostrNode } from "./tostr.js";
import { stringTonumNode } from "./tonum.js";
import { stringChrNode } from "./chr.js";
import { stringOrdNode } from "./ord.js";
import { stringSubNode } from "./sub.js";
import { stringSplitNode } from "./split.js";
import { stringTypeNode } from "./typeOf.js";

/**
 * All string-related node modules backed by PICO-8 helpers.
 */
export const stringNodes = [
  stringTostrNode,
  stringTonumNode,
  stringChrNode,
  stringOrdNode,
  stringSubNode,
  stringSplitNode,
  stringTypeNode,
];

/**
 * Checklist tracking coverage of documented string helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const stringFunctionChecklist = [
  { function: "TOSTR", nodeId: "string_tostr", implemented: true },
  { function: "TONUM", nodeId: "string_tonum", implemented: true },
  { function: "CHR", nodeId: "string_chr", implemented: true },
  { function: "ORD", nodeId: "string_ord", implemented: true },
  { function: "SUB", nodeId: "string_sub", implemented: true },
  { function: "SPLIT", nodeId: "string_split", implemented: true },
  { function: "TYPE", nodeId: "string_type", implemented: true },
];
