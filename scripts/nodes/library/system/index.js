import { loadNode } from "./load.js";
import { saveNode } from "./save.js";
import { folderNode } from "./folder.js";
import { lsNode } from "./ls.js";
import { runNode } from "./run.js";
import { stopNode } from "./stop.js";
import { resumeNode } from "./resume.js";
import { assertNode } from "./assert.js";
import { rebootNode } from "./reboot.js";
import { resetNode } from "./reset.js";
import { infoNode } from "./info.js";
import { flipNode } from "./flip.js";
import { printhNode } from "./printh.js";
import { timeNode } from "./time.js";
import { statNode } from "./stat.js";
import { extcmdNode } from "./extcmd.js";

/**
 * All system related node modules backed by PICO-8 helper functions.
 */
export const systemNodes = [
  loadNode,
  saveNode,
  folderNode,
  lsNode,
  runNode,
  stopNode,
  resumeNode,
  assertNode,
  rebootNode,
  resetNode,
  infoNode,
  flipNode,
  printhNode,
  timeNode,
  statNode,
  extcmdNode,
];

/**
 * Checklist tracking coverage of documented system helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const systemFunctionChecklist = [
  { function: "LOAD", nodeId: "system_load", implemented: true },
  { function: "SAVE", nodeId: "system_save", implemented: true },
  { function: "FOLDER", nodeId: "system_folder", implemented: true },
  { function: "LS", nodeId: "system_ls", implemented: true },
  { function: "RUN", nodeId: "system_run", implemented: true },
  { function: "STOP", nodeId: "system_stop", implemented: true },
  { function: "RESUME", nodeId: "system_resume", implemented: true },
  { function: "ASSERT", nodeId: "system_assert", implemented: true },
  { function: "REBOOT", nodeId: "system_reboot", implemented: true },
  { function: "RESET", nodeId: "system_reset", implemented: true },
  { function: "INFO", nodeId: "system_info", implemented: true },
  { function: "FLIP", nodeId: "system_flip", implemented: true },
  { function: "PRINTH", nodeId: "system_printh", implemented: true },
  { function: "TIME", nodeId: "system_time", implemented: true },
  { function: "STAT", nodeId: "system_stat", implemented: true },
  { function: "EXTCMD", nodeId: "system_extcmd", implemented: true },
];
