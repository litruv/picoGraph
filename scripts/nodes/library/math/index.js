import { mathMaxNode } from "./max.js";
import { mathMinNode } from "./min.js";
import { mathMidNode } from "./mid.js";
import { mathFlrNode } from "./flr.js";
import { mathCeilNode } from "./ceil.js";
import { mathCosNode } from "./cos.js";
import { mathSinNode } from "./sin.js";
import { mathAtan2Node } from "./atan2.js";
import { mathSqrtNode } from "./sqrt.js";
import { mathAbsNode } from "./abs.js";
import { mathRndNode } from "./rnd.js";
import { mathSrandNode } from "./srand.js";
import { mathBandNode } from "./band.js";
import { mathBorNode } from "./bor.js";
import { mathBxorNode } from "./bxor.js";
import { mathBnotNode } from "./bnot.js";
import { mathShlNode } from "./shl.js";
import { mathShrNode } from "./shr.js";
import { mathLshrNode } from "./lshr.js";
import { mathRotlNode } from "./rotl.js";
import { mathRotrNode } from "./rotr.js";
import { mathDivNode } from "./div.js";

/**
 * All math-related node modules backed by PICO-8 helpers.
 */
export const mathNodes = [
  mathMaxNode,
  mathMinNode,
  mathMidNode,
  mathFlrNode,
  mathCeilNode,
  mathCosNode,
  mathSinNode,
  mathAtan2Node,
  mathSqrtNode,
  mathAbsNode,
  mathRndNode,
  mathSrandNode,
  mathBandNode,
  mathBorNode,
  mathBxorNode,
  mathBnotNode,
  mathShlNode,
  mathShrNode,
  mathLshrNode,
  mathRotlNode,
  mathRotrNode,
  mathDivNode,
];

/**
 * Checklist tracking coverage of documented math helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const mathFunctionChecklist = [
  { function: "MAX", nodeId: "math_max", implemented: true },
  { function: "MIN", nodeId: "math_min", implemented: true },
  { function: "MID", nodeId: "math_mid", implemented: true },
  { function: "FLR", nodeId: "math_flr", implemented: true },
  { function: "CEIL", nodeId: "math_ceil", implemented: true },
  { function: "COS", nodeId: "math_cos", implemented: true },
  { function: "SIN", nodeId: "math_sin", implemented: true },
  { function: "ATAN2", nodeId: "math_atan2", implemented: true },
  { function: "SQRT", nodeId: "math_sqrt", implemented: true },
  { function: "ABS", nodeId: "math_abs", implemented: true },
  { function: "RND", nodeId: "math_rnd", implemented: true },
  { function: "SRAND", nodeId: "math_srand", implemented: true },
  { function: "BAND", nodeId: "math_band", implemented: true },
  { function: "BOR", nodeId: "math_bor", implemented: true },
  { function: "BXOR", nodeId: "math_bxor", implemented: true },
  { function: "BNOT", nodeId: "math_bnot", implemented: true },
  { function: "SHL", nodeId: "math_shl", implemented: true },
  { function: "SHR", nodeId: "math_shr", implemented: true },
  { function: "LSHR", nodeId: "math_lshr", implemented: true },
  { function: "ROTL", nodeId: "math_rotl", implemented: true },
  { function: "ROTR", nodeId: "math_rotr", implemented: true },
  { function: "\\", nodeId: "math_div", implemented: true },
];
