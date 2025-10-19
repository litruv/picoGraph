import { luaSetMetatableNode } from "./setMetatable.js";
import { luaGetMetatableNode } from "./getMetatable.js";
import { luaRawGetNode } from "./rawGet.js";
import { luaRawSetNode } from "./rawSet.js";
import { luaRawEqualNode } from "./rawEqual.js";
import { luaCoroutineCreateNode } from "./coroutineCreate.js";
import { luaCoroutineResumeNode } from "./coroutineResume.js";
import { luaCoroutineYieldNode } from "./coroutineYield.js";
import { luaCoroutineStatusNode } from "./coroutineStatus.js";
import { luaCoroutineRunningNode } from "./coroutineRunning.js";

/**
 * Node modules covering Lua metatable and coroutine helpers.
 */
export const luaNodes = [
  luaSetMetatableNode,
  luaGetMetatableNode,
  luaRawGetNode,
  luaRawSetNode,
  luaRawEqualNode,
  luaCoroutineCreateNode,
  luaCoroutineResumeNode,
  luaCoroutineYieldNode,
  luaCoroutineStatusNode,
  luaCoroutineRunningNode,
];

/**
 * Checklist tracking coverage of Lua metatable and coroutine helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const luaFunctionChecklist = [
  { function: "SETMETATABLE", nodeId: "lua_setmetatable", implemented: true },
  { function: "GETMETATABLE", nodeId: "lua_getmetatable", implemented: true },
  { function: "RAWGET", nodeId: "lua_rawget", implemented: true },
  { function: "RAWSET", nodeId: "lua_rawset", implemented: true },
  { function: "RAWEQUAL", nodeId: "lua_rawequal", implemented: true },
  {
    function: "COROUTINE.CREATE",
    nodeId: "lua_coroutine_create",
    implemented: true,
  },
  {
    function: "COROUTINE.RESUME",
    nodeId: "lua_coroutine_resume",
    implemented: true,
  },
  {
    function: "COROUTINE.YIELD",
    nodeId: "lua_coroutine_yield",
    implemented: true,
  },
  {
    function: "COROUTINE.STATUS",
    nodeId: "lua_coroutine_status",
    implemented: true,
  },
  {
    function: "COROUTINE.RUNNING",
    nodeId: "lua_coroutine_running",
    implemented: true,
  },
];
