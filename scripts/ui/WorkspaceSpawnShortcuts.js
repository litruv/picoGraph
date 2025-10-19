/**
 * @typedef {'background'|'workspace'} WorkspaceShortcutContext
 * @typedef {'shift'|'ctrl'|'alt'|'meta'} WorkspaceShortcutModifier
 * @typedef {'spawnNode'|'command'} WorkspaceShortcutAction
 *
 * @typedef {Object} WorkspaceShortcut
 * @property {string} key Primary keyboard key that must be held to activate the shortcut.
 * @property {WorkspaceShortcutContext} context Interaction context in which the shortcut is valid.
 * @property {WorkspaceShortcutAction} action Action the shortcut executes.
 * @property {string} [definitionId] Node definition identifier (required when {@link action} is `spawnNode`).
 * @property {string} [command] Workspace command identifier (required when {@link action} is `command`).
 * @property {number} [button] Pointer button required for pointer-based shortcuts. Defaults to the primary button.
 * @property {Array<WorkspaceShortcutModifier>} [modifiers] Modifier keys that must be held alongside the primary key.
 */

/** @type {Array<WorkspaceShortcut>} */
export const WORKSPACE_SHORTCUTS = [
  {
    key: "s",
    context: "background",
    action: "spawnNode",
    definitionId: "sequence",
  },
  {
    key: "c",
    context: "workspace",
    action: "command",
    command: "copy",
    modifiers: ["ctrl"],
  },
  {
    key: "x",
    context: "workspace",
    action: "command",
    command: "cut",
    modifiers: ["ctrl"],
  },
  {
    key: "v",
    context: "workspace",
    action: "command",
    command: "paste",
    modifiers: ["ctrl"],
  },
  {
    key: "z",
    context: "workspace",
    action: "command",
    command: "undo",
    modifiers: ["ctrl"],
  },
  {
    key: "z",
    context: "workspace",
    action: "command",
    command: "redo",
    modifiers: ["ctrl", "shift"],
  },
  {
    key: "y",
    context: "workspace",
    action: "command",
    command: "redo",
    modifiers: ["ctrl"],
  },
  {
    key: "delete",
    context: "workspace",
    action: "command",
    command: "delete",
  },
];
