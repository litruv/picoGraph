import { getLiteralNodeModules } from "../../core/lua/LuaLiteralTypes.js";
import { eventInitNode } from "./eventStart.js";
import { eventUpdateNode } from "./eventUpdate.js";
import { eventDrawNode } from "./eventDraw.js";
import { printNode } from "./print.js";
import { setVariableNode } from "./setVariable.js";
import { getVariableNode } from "./getVariable.js";
import { compareNode } from "./compare.js";
import { sequenceNode } from "./sequence.js";
import { ifNode } from "./ifNode.js";
import { forLoopNode } from "./forLoop.js";
import { customEventNode } from "./customEvent.js";
import { callCustomEventNode } from "./callCustomEvent.js";
import { graphicsNodes, graphicsFunctionChecklist } from "./graphics/index.js";
import { systemNodes, systemFunctionChecklist } from "./system/index.js";
import { tableNodes, tableFunctionChecklist } from "./table/index.js";
import { inputNodes, inputFunctionChecklist } from "./input/index.js";
import { audioNodes, audioFunctionChecklist } from "./audio/index.js";
import { mapNodes, mapFunctionChecklist } from "./map/index.js";
import { memoryNodes, memoryFunctionChecklist } from "./memory/index.js";
import { mathNodes, mathFunctionChecklist } from "./math/index.js";
import { menuNodes, menuFunctionChecklist } from "./menu/index.js";
import { stringNodes, stringFunctionChecklist } from "./strings/index.js";
import { dataNodes, dataFunctionChecklist } from "./data/index.js";
import { gpioNodes, gpioFunctionChecklist } from "./gpio/index.js";
import { serialNodes, serialFunctionChecklist } from "./serial/index.js";
import { devkitNodes, devkitFunctionChecklist } from "./devkit/index.js";
import { luaNodes, luaFunctionChecklist } from "./lua/index.js";
import { localVariableNodes } from "./localVariables.js";
import { converterNodes } from "./converters/index.js";
import { rerouteNode, rerouteExecNode } from "./reroute.js";

export const nodeModules = [
  ...getLiteralNodeModules(),
  eventInitNode,
  eventUpdateNode,
  eventDrawNode,
  printNode,
  setVariableNode,
  getVariableNode,
  compareNode,
  sequenceNode,
  ifNode,
  forLoopNode,
  customEventNode,
  callCustomEventNode,
  ...localVariableNodes,
  ...converterNodes,
  rerouteNode,
  rerouteExecNode,
  ...graphicsNodes,
  ...systemNodes,
  ...tableNodes,
  ...inputNodes,
  ...audioNodes,
  ...mapNodes,
  ...memoryNodes,
  ...mathNodes,
  ...menuNodes,
  ...stringNodes,
  ...dataNodes,
  ...gpioNodes,
  ...serialNodes,
  ...devkitNodes,
  ...luaNodes,
];

export {
  systemFunctionChecklist,
  graphicsFunctionChecklist,
  tableFunctionChecklist,
  inputFunctionChecklist,
  audioFunctionChecklist,
  mapFunctionChecklist,
  memoryFunctionChecklist,
  mathFunctionChecklist,
  menuFunctionChecklist,
  stringFunctionChecklist,
  dataFunctionChecklist,
  gpioFunctionChecklist,
  serialFunctionChecklist,
  devkitFunctionChecklist,
  luaFunctionChecklist,
};
