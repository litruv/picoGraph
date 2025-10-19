import { tableAddNode } from "./add.js";
import { tableDelNode } from "./del.js";
import { tableDeliNode } from "./deli.js";
import { tableCountNode } from "./count.js";
import { tableAllNode } from "./all.js";
import { tableForeachNode } from "./foreach.js";
import { tablePairsNode } from "./pairs.js";

/**
 * All table-related node modules backed by PICO-8 helpers.
 */
export const tableNodes = [
  tableAddNode,
  tableDelNode,
  tableDeliNode,
  tableCountNode,
  tableAllNode,
  tableForeachNode,
  tablePairsNode,
];

/**
 * Checklist tracking table helper coverage from the PICO-8 manual.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const tableFunctionChecklist = [
  { function: "ADD", nodeId: "table_add", implemented: true },
  { function: "DEL", nodeId: "table_del", implemented: true },
  { function: "DELI", nodeId: "table_deli", implemented: true },
  { function: "COUNT", nodeId: "table_count", implemented: true },
  { function: "ALL", nodeId: "table_all", implemented: true },
  { function: "FOREACH", nodeId: "table_foreach", implemented: true },
  { function: "PAIRS", nodeId: "table_pairs", implemented: true },
];
