import type { PlatformSDK } from '../client/index.js';

/**
 * Subscribes to the platform mute state, **including its current value**.
 *
 * The platform owns the mute toggle so it stays consistent across every game.
 * Subscribing to changes alone is the easy way to break that promise: the game
 * boots, never reads `context.isMuted`, and plays sound the player muted in a
 * different game. This delivers the current value first, then every change.
 *
 * `onChange` always fires at least once, and only when the value actually
 * differs from the last one delivered.
 *
 * One known gap, left open deliberately: the first value comes from the
 * handshake context, so a mute toggled in the narrow window between the
 * handshake and this call is missed until the next toggle. Closing it would
 * mean a new SDK method for a race measured in milliseconds, and the SDK
 * surface is worth more than that.
 */
export function watchMute(sdk: PlatformSDK, onChange: (muted: boolean) => void): () => void {
  let stopped = false;
  let delivered: boolean | undefined;

  const deliver = (muted: boolean): void => {
    if (stopped || muted === delivered) return;
    delivered = muted;
    onChange(muted);
  };

  const off = sdk.onMuteChange(deliver);

  void sdk.ready().then(
    (context) => {
      // A change event that beat the handshake already told us the truth.
      if (delivered === undefined) deliver(context.isMuted);
    },
    () => {
      // No host to ask. Fall back to the platform default so the game still
      // gets its one guaranteed call and can render a sound button.
      if (delivered === undefined) deliver(false);
    },
  );

  return () => {
    stopped = true;
    off();
  };
}
