import { mapMgetNode } from "./mget.js";
import { mapMsetNode } from "./mset.js";
import { mapDrawNode } from "./map.js";
import { mapTlineNode } from "./tline.js";

/**
 * All map-related node modules backed by PICO-8 helpers.
 */
export const mapNodes = [mapMgetNode, mapMsetNode, mapDrawNode, mapTlineNode];

/**
 * Checklist tracking coverage of documented map helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const mapFunctionChecklist = [
  { function: "MGET", nodeId: "map_mget", implemented: true },
  { function: "MSET", nodeId: "map_mset", implemented: true },
  { function: "MAP", nodeId: "map_map", implemented: true },
  { function: "TLINE", nodeId: "map_tline", implemented: true },
];
