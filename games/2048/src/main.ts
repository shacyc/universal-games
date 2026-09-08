import { createClient } from '@platform/sdk/client';

/**
 * Pipeline harness — NOT the game.
 *
 * Everything below exists to prove the platform works end to end before any
 * 2048 code is written: the handshake resolves in both embedded and installed
 * modes, saves round-trip, ad call sites are real, lifecycle events reach the
 * host. `docs/game-2048.md` replaces this file.
 */
const sdk = createClient({ slug: '2048' });

const app = document.getElementById('app');
if (!app) throw new Error('#app is missing from index.html');

function line(text: string): void {
  const p = document.createElement('p');
  p.textContent = text;
  app?.append(p);
}

function action(label: string, run: () => void | Promise<void>): void {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', () => void run());
  app?.append(button);
}

async function boot(): Promise<void> {
  const context = await sdk.ready();
  line(`slug: ${context.slug}`);
  line(`locale: ${context.locale}`);
  line(`installed: ${context.isInstalled}`);
  line(`muted: ${context.isMuted}`);
  line(`host: ${window.parent === window ? 'standalone (in-process)' : 'shell (MessagePort)'}`);

  const user = await sdk.getUser();
  line(`user: ${user.id} (anonymous: ${user.isAnonymous})`);

  sdk.onMuteChange((isMuted) => line(`mute changed: ${isMuted}`));

  action('save { ticks: n }', async () => {
    const previous = await sdk.load();
    const ticks = isTicks(previous) ? previous.ticks + 1 : 1;
    await sdk.save({ ticks });
    line(`saved ticks: ${ticks}`);
  });

  action('load', async () => {
    line(`loaded: ${JSON.stringify(await sdk.load())}`);
  });

  action('rewarded (undo)', async () => {
    line(`rewarded resolved: ${await sdk.showRewarded('undo')}`);
  });

  action('interstitial (run_end)', async () => {
    await sdk.showInterstitial('run_end');
    line('interstitial resolved');
  });

  action('gameStart', () => sdk.gameStart());
  action('gameOver { score: 1234 }', () => sdk.gameOver({ score: 1234 }));
  action('track(demo_event)', () => sdk.track('demo_event', { source: 'harness' }));
}

/** The save came from storage, so its shape is checked rather than asserted. */
function isTicks(value: unknown): value is { ticks: number } {
  return typeof value === 'object' && value !== null && typeof (value as { ticks?: unknown }).ticks === 'number';
}

void boot().catch((error: unknown) => {
  line(`boot failed: ${error instanceof Error ? error.message : String(error)}`);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registered at this game's own scope so it installs as its own PWA.
    void navigator.serviceWorker.register('/g/2048/sw.js', { scope: '/g/2048/' }).catch((error: unknown) => {
      console.debug('[2048] service worker registration failed', error);
    });
  });
}
