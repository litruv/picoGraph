import { createNodeModule } from "../../nodeTypes.js";

/**
 * Plays or stops music using the PICO-8 music helper.
 */
export const musicNode = createNodeModule(
  {
    id: "audio_music",
    title: "Play Music",
    category: "Audio",
    description:
      "Start, fade, or stop music playback using MUSIC().",
    searchTags: ["music", "audio", "song", "pattern"],
    inputs: [
      { id: "exec_in", name: "Exec", direction: "input", kind: "exec" },
      {
        id: "pattern",
        name: "Pattern",
        direction: "input",
        kind: "number",
        description: "Pattern index or command",
        defaultValue: 0,
      },
      {
        id: "fade",
        name: "Fade (ms)",
        direction: "input",
        kind: "number",
        description: "Fade duration in milliseconds",
      },
      {
        id: "mask",
        name: "Channel Mask",
        direction: "input",
        kind: "number",
        description: "Bitmask reserving channels",
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
      const pattern = resolveValueInput("pattern", "0");
      const fade = resolveValueInput("fade", OMIT);
      const mask = resolveValueInput("mask", OMIT);

      const args = [pattern];
      if (fade !== OMIT || mask !== OMIT) {
        const fadeArg = fade === OMIT ? "nil" : fade;
        args.push(fadeArg);
        if (mask !== OMIT) {
          args.push(mask);
        }
      }

      const line = `${indent(indentLevel)}music(${args.join(", ")})`;
      return [line, ...emitNextExec("exec_out")];
    },
  }
);
