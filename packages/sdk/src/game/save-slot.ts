import type { PlatformSDK } from '../client/index.js';

export interface SaveSlot<T> {
  /**
   * The stored run, or `null` when there is none, it failed validation, or it
   * could not be read. Never rejects — a game boots the same way either way.
   */
  load(): Promise<T | null>;
  /**
   * Fire-and-forget. The host debounces and coalesces, so a game may call this
   * on every move; errors are logged, never surfaced mid-run.
   */
  save(state: T): void;
  /** False once a read failed — see the note in `load`. */
  readonly writable: boolean;
}

/**
 * A typed slot over `sdk.load()` / `sdk.save()`.
 *
 * `sdk.load()` returns `unknown` on purpose: a save carries its own version
 * because its shape is expected to change, so a stale or corrupt payload is a
 * case to handle rather than a crash to hit deep in game code. Every game
 * would otherwise repeat the same validate-or-discard dance, and the one that
 * gets it wrong trusts an old save and breaks.
 *
 * `validate` runs at the boundary and returns `null` for anything it does not
 * recognise. Throwing is treated the same way.
 */
export function createSaveSlot<T>(
  sdk: PlatformSDK,
  validate: (raw: unknown) => T | null,
): SaveSlot<T> {
  let writable = true;

  return {
    async load(): Promise<T | null> {
      let raw: unknown;
      try {
        raw = await sdk.load();
      } catch (error) {
        // The read failed, but the slot may well hold a run the player still
        // has. Writing now would overwrite it with a fresh board, so stop
        // writing until a later read succeeds. Losing this session beats
        // destroying the saved one.
        writable = false;
        console.warn('[game] save slot unreadable — saving is suspended', error);
        return null;
      }

      writable = true;
      if (raw === null || raw === undefined) return null;

      try {
        return validate(raw) ?? null;
      } catch {
        // Written by an older build of this game. Start fresh.
        return null;
      }
    },

    save(state: T): void {
      if (!writable) return;
      void sdk.save(state).catch((error: unknown) => {
        console.debug('[game] save failed', error);
      });
    },

    get writable(): boolean {
      return writable;
    },
  };
}
