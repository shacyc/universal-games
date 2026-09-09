import { resolveLocale } from '../locale.js';
import type { PlatformSDK } from '../client/index.js';

/**
 * Subscribes to the platform language, **including its current value**,
 * already resolved to one of the locales this game ships.
 *
 * The same shape as `watchMute`, for the same reason: the shell owns the
 * picker, so a game that read the handshake once would keep rendering the old
 * language after the player switched. `onChange` always fires at least once,
 * and only when the resolved locale actually differs from the last one.
 *
 * `supported` must be non-empty and its first entry is the fallback — make
 * that the language the game is authored in, so a missing translation degrades
 * to real text rather than to a key.
 *
 * The same known gap as `watchMute`: the first value comes from the handshake
 * context, so a language switched in the milliseconds between the handshake
 * and this call is missed until the next switch.
 */
export function watchLocale(
  sdk: PlatformSDK,
  supported: readonly string[],
  onChange: (locale: string) => void,
): () => void {
  const fallback = supported[0];
  if (fallback === undefined) throw new Error('watchLocale: `supported` must list at least one locale');

  let stopped = false;
  let delivered: string | undefined;

  const deliver = (tag: string): void => {
    const resolved = resolveLocale(tag, supported, fallback);
    if (stopped || resolved === delivered) return;
    delivered = resolved;
    onChange(resolved);
  };

  const off = sdk.onLocaleChange(deliver);

  void sdk.ready().then(
    (context) => {
      if (delivered === undefined) deliver(context.locale);
    },
    () => {
      // No host to ask. The game still gets its one guaranteed call, in the
      // language it was authored in, rather than rendering nothing.
      if (delivered === undefined) deliver(fallback);
    },
  );

  return () => {
    stopped = true;
    off();
  };
}
