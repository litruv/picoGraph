import { sfxNode } from "./sfx.js";
import { musicNode } from "./music.js";

/**
 * All audio-related node modules backed by PICO-8 helpers.
 */
export const audioNodes = [sfxNode, musicNode];

/**
 * Checklist tracking coverage of documented audio helpers.
 * @type {Array<{ function: string, nodeId: string, implemented: boolean }>}
 */
export const audioFunctionChecklist = [
  { function: "SFX", nodeId: "audio_sfx", implemented: true },
  { function: "MUSIC", nodeId: "audio_music", implemented: true },
];
