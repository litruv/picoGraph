import { clipNode } from "./clip.js";
import { psetNode } from "./pset.js";
import { pgetNode } from "./pget.js";
import { sgetNode } from "./sget.js";
import { ssetNode } from "./sset.js";
import { fgetNode } from "./fget.js";
import { fsetNode } from "./fset.js";
import { cursorNode } from "./cursor.js";
import { colorNode } from "./color.js";
import { clsNode } from "./cls.js";
import { cameraNode } from "./camera.js";
import { circNode } from "./circ.js";
import { circfillNode } from "./circfill.js";
import { ovalNode } from "./oval.js";
import { ovalfillNode } from "./ovalfill.js";
import { lineNode } from "./line.js";
import { rectNode } from "./rect.js";
import { rectfillNode } from "./rectfill.js";
import { rrectNode } from "./rrect.js";
import { rrectfillNode } from "./rrectfill.js";
import { palNode } from "./pal.js";
import { paltNode } from "./palt.js";
import { sprNode } from "./spr.js";
import { ssprNode } from "./sspr.js";
import { fillpNode } from "./fillp.js";

/**
 * All graphics related node modules backed by PICO-8 draw helpers.
 */
export const graphicsNodes = [
  clipNode,
  psetNode,
  pgetNode,
  sgetNode,
  ssetNode,
  fgetNode,
  fsetNode,
  cursorNode,
  colorNode,
  clsNode,
  cameraNode,
  circNode,
  circfillNode,
  ovalNode,
  ovalfillNode,
  lineNode,
  rectNode,
  rectfillNode,
  rrectNode,
  rrectfillNode,
  palNode,
  paltNode,
  sprNode,
  ssprNode,
  fillpNode,
];

/**
 * Checklist tracking coverage of documented graphics helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const graphicsFunctionChecklist = [
  { function: "CLIP", nodeId: "graphics_clip", implemented: true },
  { function: "PSET", nodeId: "graphics_pset", implemented: true },
  { function: "PGET", nodeId: "graphics_pget", implemented: true },
  { function: "SGET", nodeId: "graphics_sget", implemented: true },
  { function: "SSET", nodeId: "graphics_sset", implemented: true },
  { function: "FGET", nodeId: "graphics_fget", implemented: true },
  { function: "FSET", nodeId: "graphics_fset", implemented: true },
  { function: "CURSOR", nodeId: "graphics_cursor", implemented: true },
  { function: "COLOR", nodeId: "graphics_color", implemented: true },
  { function: "CLS", nodeId: "graphics_cls", implemented: true },
  { function: "CAMERA", nodeId: "graphics_camera", implemented: true },
  { function: "CIRC", nodeId: "graphics_circ", implemented: true },
  { function: "CIRCFILL", nodeId: "graphics_circfill", implemented: true },
  { function: "OVAL", nodeId: "graphics_oval", implemented: true },
  { function: "OVALFILL", nodeId: "graphics_ovalfill", implemented: true },
  { function: "LINE", nodeId: "graphics_line", implemented: true },
  { function: "RECT", nodeId: "graphics_rect", implemented: true },
  { function: "RECTFILL", nodeId: "graphics_rectfill", implemented: true },
  { function: "RRECT", nodeId: "graphics_rrect", implemented: true },
  { function: "RRECTFILL", nodeId: "graphics_rrectfill", implemented: true },
  { function: "PAL", nodeId: "graphics_pal", implemented: true },
  { function: "PALT", nodeId: "graphics_palt", implemented: true },
  { function: "SPR", nodeId: "graphics_spr", implemented: true },
  { function: "SSPR", nodeId: "graphics_sspr", implemented: true },
  { function: "FILLP", nodeId: "graphics_fillp", implemented: true },
];
