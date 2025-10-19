import { createNodeModule } from "../../nodeTypes.js";

const EXT_CMD_DEFAULT = "reset";

const EXT_CMD_OPTIONS = [
  { value: "pause", label: "Pause Menu" },
  { value: EXT_CMD_DEFAULT, label: "Reset Cart" },
  { value: "go_back", label: "Return To Previous Cart" },
  { value: "label", label: "Capture Label" },
  { value: "screen", label: "Save Screenshot" },
  { value: "rec", label: "Mark Video Start" },
  { value: "rec_frames", label: "Mark Video Start (Frames)" },
  { value: "video", label: "Save Video" },
  { value: "audio_rec", label: "Start Audio Recording" },
  { value: "audio_end", label: "Finish Audio Recording" },
  { value: "shutdown", label: "Shutdown Cartridge" },
  { value: "folder", label: "Open Cartridge Folder" },
  { value: "set_filename", label: "Set Capture Filename" },
  { value: "set_title", label: "Set Window Title" },
];

/**
 * Issues special host commands such as screenshots or recordings.
 */
export const extcmdNode = createNodeModule(
  {
    id: "system_extcmd",
    title: "System Command",
    category: "System",
    description: "Execute a special system command using extcmd().",
    searchTags: [
      "extcmd",
      "system",
      "command",
      "host",
      "screenshot",
      "video",
      "audio",
      "pause",
      "reset",
    ],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      { id: "command", name: "Command", direction: "input", kind: "string" },
      { id: "param1", name: "Param 1", direction: "input", kind: "number" },
      { id: "param2", name: "Param 2", direction: "input", kind: "number" },
    ],
    outputs: [
      { id: "exec_out", name: "Exec", direction: "output", kind: "exec" },
    ],
    properties: [
      {
        key: "command",
        label: "Command",
        type: "enum",
        defaultValue: EXT_CMD_DEFAULT,
        options: EXT_CMD_OPTIONS,
      },
    ],
  },
  {
    emitExec: ({
      node,
      indent,
      indentLevel,
      resolveValueInput,
      emitNextExec,
      formatLiteral,
    }) => {
      const OMIT = "__pg_omit__";
      const fallbackCommand = formatLiteral(
        "string",
        node.properties.command ?? EXT_CMD_DEFAULT
      );
      const command = resolveValueInput("command", fallbackCommand);
      const param1 = resolveValueInput("param1", OMIT);
      const param2 = resolveValueInput("param2", OMIT);

      const args = [command];
      if (param1 !== OMIT || param2 !== OMIT) {
        const param1Arg = param1 === OMIT ? "nil" : param1;
        args.push(param1Arg);
        if (param2 !== OMIT) {
          args.push(param2);
        }
      }

      const lines = [`${indent(indentLevel)}extcmd(${args.join(", ")})`];
      lines.push(...emitNextExec("exec_out"));
      return lines;
    },
  }
);
