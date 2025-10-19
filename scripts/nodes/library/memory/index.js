import { memoryPeekNode } from "./peek.js";
import { memoryPeek2Node } from "./peek2.js";
import { memoryPeek4Node } from "./peek4.js";
import { memoryPokeNode } from "./poke.js";
import { memoryPoke2Node } from "./poke2.js";
import { memoryPoke4Node } from "./poke4.js";
import { memoryMemcpyNode } from "./memcpy.js";
import { memoryMemsetNode } from "./memset.js";
import { memoryReloadNode } from "./reload.js";
import { memoryCstoreNode } from "./cstore.js";

/**
 * All memory-related node modules backed by PICO-8 helpers.
 */
export const memoryNodes = [
  memoryPeekNode,
  memoryPeek2Node,
  memoryPeek4Node,
  memoryPokeNode,
  memoryPoke2Node,
  memoryPoke4Node,
  memoryMemcpyNode,
  memoryMemsetNode,
  memoryReloadNode,
  memoryCstoreNode,
];

/**
 * Checklist tracking coverage of documented memory helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const memoryFunctionChecklist = [
  { function: "PEEK", nodeId: "memory_peek", implemented: true },
  { function: "PEEK2", nodeId: "memory_peek2", implemented: true },
  { function: "PEEK4", nodeId: "memory_peek4", implemented: true },
  { function: "POKE", nodeId: "memory_poke", implemented: true },
  { function: "POKE2", nodeId: "memory_poke2", implemented: true },
  { function: "POKE4", nodeId: "memory_poke4", implemented: true },
  { function: "MEMCPY", nodeId: "memory_memcpy", implemented: true },
  { function: "MEMSET", nodeId: "memory_memset", implemented: true },
  { function: "RELOAD", nodeId: "memory_reload", implemented: true },
  { function: "CSTORE", nodeId: "memory_cstore", implemented: true },
];
