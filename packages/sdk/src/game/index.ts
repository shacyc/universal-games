/**
 * Client-side helpers for writing a game.
 *
 * These add no methods to the wire protocol — nothing here is a new thing the
 * host must support. Each one implements a rule that `docs/platform-sdk.md`
 * already states, once, so that ten separately-written games cannot each
 * interpret it differently.
 *
 * Anything that would be generalised *from* game code — canvas sizing, input,
 * tweening, grid state, UI chrome — deliberately does not live here yet.
 */
export { createSaveSlot, type SaveSlot } from './save-slot.js';
export { watchMute } from './mute.js';
export { watchLocale } from './locale.js';
export { resolveLocale } from '../locale.js';
