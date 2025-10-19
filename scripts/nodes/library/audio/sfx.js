import { createNodeModule } from "../../nodeTypes.js";

/**
 * Plays or controls a sound effect using the PICO-8 sfx helper.
 */
export const sfxNode = createNodeModule(
  {
    id: "audio_sfx",
    title: "Play SFX",
    category: "Audio",
    description:
      "Trigger a sound effect, control looping, or stop playback via SFX().",
    searchTags: ["sfx", "audio", "sound", "effect"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "id",
        name: "SFX",
        direction: "input",
        kind: "number",
        description: "Sound effect slot or command",
        defaultValue: 0,
      },
      {
        id: "channel",
        name: "Channel",
        direction: "input",
        kind: "number",
        description: "Playback channel (-1 auto)",
      },
      {
        id: "offset",
        name: "Offset",
        direction: "input",
        kind: "number",
        description: "Note offset",
      },
      {
        id: "length",
        name: "Length",
        direction: "input",
        kind: "number",
        description: "Number of notes to play",
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
      const id = resolveValueInput("id", "0");
      const channel = resolveValueInput("channel", OMIT);
      const offset = resolveValueInput("offset", OMIT);
      const length = resolveValueInput("length", OMIT);

      const args = [id];
      if (channel !== OMIT || offset !== OMIT || length !== OMIT) {
        const channelArg = channel === OMIT ? "nil" : channel;
        args.push(channelArg);
        if (offset !== OMIT || length !== OMIT) {
          const offsetArg = offset === OMIT ? "nil" : offset;
          args.push(offsetArg);
          if (length !== OMIT) {
            args.push(length);
          }
        }
      }

      const line = `${indent(indentLevel)}sfx(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
