/**
 * The wire contract between the shell (host) and a game (client).
 *
 * This module is imported by both sides and must stay dependency-free and
 * side-effect-free. Changing anything here is a breaking change for every
 * game bundle already cached by a per-game service worker, so prefer adding
 * a method over changing an existing shape.
 */

export const PROTOCOL_VERSION = 1;

export type ErrorCode =
  /** Host does not implement this method — usually shell/game version skew. */
  | 'UNKNOWN_METHOD'
  /** Params failed validation at the host boundary. */
  | 'BAD_PARAMS'
  /** Request arrived before the handshake completed. */
  | 'NOT_READY'
  /** Storage adapter refused the read/write. */
  | 'STORAGE_FAILED'
  /** Anything unexpected, including client-side request timeouts. */
  | 'INTERNAL';

export interface RpcError {
  code: ErrorCode;
  message: string;
}

/** Everything the game is allowed to know about where it is running. */
export interface GameContext {
  slug: string;
  locale: string;
  /** Running as an installed PWA rather than a browser tab. */
  isInstalled: boolean;
  /** Platform-level sound preference. Games read this, never own it. */
  isMuted: boolean;
}

/** The complete set of methods a v0 host answers. */
export const METHODS = [
  'getUser',
  'load',
  'save',
  'showRewarded',
  'showInterstitial',
  'gameStart',
  'gameOver',
  'track',
] as const;

export type Method = (typeof METHODS)[number];

export interface Request {
  v: typeof PROTOCOL_VERSION;
  id: number;
  method: string;
  params?: unknown;
}

export type Response =
  | { v: typeof PROTOCOL_VERSION; id: number; ok: true; data: unknown }
  | { v: typeof PROTOCOL_VERSION; id: number; ok: false; error: RpcError };

/**
 * Unsolicited host -> client message. No id, no reply.
 *
 * `mute` exists because the SDK docs require games to subscribe to the
 * platform mute state, and a request/response pair cannot express that.
 * `pause`/`resume` cover the shell covering the game with its own UI.
 */
export type HostEvent =
  | { v: typeof PROTOCOL_VERSION; type: 'mute'; data: { isMuted: boolean } }
  | { v: typeof PROTOCOL_VERSION; type: 'pause' }
  | { v: typeof PROTOCOL_VERSION; type: 'resume' };

export type HostEventType = HostEvent['type'];

/** Handshake: game -> shell, over `window.postMessage`. */
export interface Hello {
  v: typeof PROTOCOL_VERSION;
  type: 'hello';
}

/**
 * Handshake reply: shell -> game, carrying a MessagePort in `event.ports[0]`.
 * All traffic after this moves to that port.
 */
export interface Welcome {
  v: typeof PROTOCOL_VERSION;
  type: 'welcome';
  context: GameContext;
}

function isEnvelope(value: unknown): value is { v: number } {
  return typeof value === 'object' && value !== null && (value as { v?: unknown }).v === PROTOCOL_VERSION;
}

export function isRequest(value: unknown): value is Request {
  if (!isEnvelope(value)) return false;
  const m = value as Partial<Request>;
  return typeof m.id === 'number' && typeof m.method === 'string';
}

export function isResponse(value: unknown): value is Response {
  if (!isEnvelope(value)) return false;
  const m = value as Partial<Response>;
  return typeof m.id === 'number' && typeof m.ok === 'boolean';
}

export function isHostEvent(value: unknown): value is HostEvent {
  if (!isEnvelope(value)) return false;
  const t = (value as { type?: unknown }).type;
  return t === 'mute' || t === 'pause' || t === 'resume';
}

export function isHello(value: unknown): value is Hello {
  return isEnvelope(value) && (value as { type?: unknown }).type === 'hello';
}

export function isWelcome(value: unknown): value is Welcome {
  if (!isEnvelope(value)) return false;
  const m = value as Partial<Welcome>;
  return m.type === 'welcome' && typeof m.context === 'object' && m.context !== null;
}

export function ok(id: number, data: unknown): Response {
  return { v: PROTOCOL_VERSION, id, ok: true, data };
}

export function err(id: number, code: ErrorCode, message: string): Response {
  return { v: PROTOCOL_VERSION, id, ok: false, error: { code, message } };
}
