import { createNodeModule } from "../../nodeTypes.js";

/**
 * Adds or updates a pause menu item using PICO-8's menuitem helper.
 */
export const menuItemNode = createNodeModule(
  {
    id: "menu_item",
    title: "Menu Item",
    category: "Menu",
    description:
      "Add, update, or remove a custom pause menu entry using MENUITEM().",
    searchTags: ["menu", "menuitem", "pause", "ui"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "index",
        name: "Index",
        direction: "input",
        kind: "number",
        description: "Menu slot and optional mask",
        defaultValue: 1,
      },
      {
        id: "label",
        name: "Label",
        direction: "input",
        kind: "string",
        description: "Menu label or nil to remove",
      },
      {
        id: "callback",
        name: "Callback",
        direction: "input",
        kind: "any",
        description: "Function reference to invoke",
      },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [],
  },
  {
    emitExec: ({ indent, indentLevel, resolveValueInput, emitNextExec }) => {
      const OMIT = "__pg_omit__";
      const index = resolveValueInput("index", "1");
      const label = resolveValueInput("label", OMIT);
      const callback = resolveValueInput("callback", OMIT);

      const args = [index];
      if (label !== OMIT || callback !== OMIT) {
        args.push(label === OMIT ? "nil" : label);
        if (callback !== OMIT) {
          args.push(callback);
        }
      }

      const line = `${indent(indentLevel)}menuitem(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
