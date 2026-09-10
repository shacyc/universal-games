/*
 * Boot and the game loop. The orchestrator: it owns the phase machine, the
 * tick accumulator (plan §4), the one pause/resume pair fed from every source
 * (plan §5), and the wiring between the pure core, the renderer, the DOM
 * (`ui.ts`) and the platform (`session.ts`).
 */
import './styles.css';
import { newRun, queueTurn, reviveRun, step, type Dir, type Run } from './snake.js';
import { toSavedRun, fromSavedRun, type SaveState } from './save.js';
import { createInput } from './input.js';
import { EMPTY_ASSETS, loadAssets } from './assets.js';
import { createRenderer } from './render.js';
import { createUi, type View } from './ui.js';
import { createSession } from './session.js';
import { stringsFor, type Strings } from './i18n/index.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
const COUNTDOWN_FROM = 3;
/** Longest a turn press waits before the snake acts on it (ms). */
const TURN_LAT_MS = 55;

type Phase = 'start' | 'idle' | 'running' | 'paused' | 'gameover';

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('#app is missing');

  const session = createSession();

  let locale = 'en';
  let strings: Strings = stringsFor(locale);

  const assets = await loadAssets().catch(() => EMPTY_ASSETS);

  const ui = createUi(
    root,
    {
      onPlay: () => beginPlay(),
      onResume: () => beginCountdown(),
      onRevive: () => void takeRevive(),
      onNewGame: () => void newGame(),
      onSetLocale: (tag) => session.setLocale(tag),
      onExitToHub: () => {
        session.save(snapshot());
        session.exitToHub();
      },
    },
    strings,
    locale,
    assets.title,
  );

  const renderer = createRenderer(ui.canvas, ui.surface, assets);

  const rng = Math.random;

  let run: Run = newRun(rng);
  let prev: Run | null = null;
  let phase: Phase = 'start';
  let acc = 0;
  let last = performance.now();
  // When the last tick fired. A turn may pull the next tick forward to within
  // TURN_LAT_MS, but never closer to this than (tickMs - TURN_LAT_MS) — a turn
  // phase-shifts the clock, it does not raise the average speed.
  let lastStepAt = 0;
  let best = 0;
  let ateAt: number | null = null;
  let deadAt: number | null = null;
  let runReported = false;
  let bestBeatenFired = false;
  let startedAt = 0;
  let endedAt = 0;
  let countdownTimer: number | null = null;

  const tickMs = (): number => 1000 / run.speed;

  const snapshot = (): SaveState => ({
    v: 1,
    best,
    run: phase === 'running' || phase === 'paused' ? toSavedRun(run) : null,
  });

  const clearFresh = (): void => {
    run = newRun(rng);
    prev = null;
    acc = 0;
    ateAt = null;
    deadAt = null;
    runReported = false;
    bestBeatenFired = false;
  };

  const setView = (v: View): void => {
    phase = v === 'gameover' ? 'gameover' : (v as Phase);
    ui.setView(v);
  };

  const cancelCountdown = (): void => {
    if (countdownTimer !== null) {
      clearTimeout(countdownTimer);
      countdownTimer = null;
    }
    ui.setCountdown(null);
  };

  // ---- transitions -------------------------------------------------------

  const beginPlay = (): void => {
    clearFresh();
    setView('idle');
  };

  const startRunNow = (): void => {
    session.startRun();
    runReported = false;
    bestBeatenFired = false;
    startedAt = performance.now();
    endedAt = 0;
  };

  const beginCountdown = (): void => {
    // From the paused overlay or after a revive: never resume straight into
    // motion (brief §8).
    cancelCountdown();
    ui.setView('paused');
    let n = COUNTDOWN_FROM;
    const tick = (): void => {
      ui.setCountdown(n);
      if (n === 0) {
        countdownTimer = null;
        cancelCountdown();
        last = performance.now();
        lastStepAt = last;
        acc = tickMs(); // "GO" moves the snake now, not one tick later
        setView('running');
        return;
      }
      n -= 1;
      countdownTimer = window.setTimeout(tick, 650);
    };
    tick();
  };

  const endRunOnce = (): void => {
    if (runReported) return;
    runReported = true;
    session.endRun({
      score: run.score,
      length: run.body.length,
      // The run's length, not the time the player took to dismiss the card:
      // measure to the death tick, not to "New game".
      durationMs: Math.max(0, Math.round((endedAt || performance.now()) - startedAt)),
    });
  };

  const onDeath = (now: number): void => {
    deadAt = now;
    endedAt = performance.now();
    acc = 0;
    cancelCountdown();

    const canRevive = !run.revived;
    ui.setGameOver({ score: run.score, best, canRevive });
    setView('gameover');
    if (canRevive) {
      session.track('revive_offered');
    } else {
      endRunOnce();
    }
    // The run is off the board now; the game-over card is UI only.
    session.save({ v: 1, best, run: null });
  };

  const takeRevive = async (): Promise<void> => {
    if (phase !== 'gameover' || run.revived) return;
    const ok = await session.offerRevive();
    if (ok) {
      session.track('revive_taken');
      run = reviveRun(run, rng);
      prev = null;
      deadAt = null;
      // Persist the revived run now: `snapshot()` would still see phase
      // `gameover` and write `run: null`, losing the revive if the tab dies
      // during the countdown.
      session.save({ v: 1, best, run: toSavedRun(run) });
      beginCountdown();
    } else {
      // Declined / no fill / failed — changes nothing (hard rule 5).
      ui.reviveSpent();
      endRunOnce();
    }
  };

  const newGame = async (): Promise<void> => {
    endRunOnce();
    setView('start'); // show the card immediately; the interstitial is between sessions
    await session.interstitialBeforeNewGame();
    clearFresh();
    session.save({ v: 1, best, run: null });
    ui.setHud(0, best);
    ui.setView('start');
  };

  // ---- pause / resume, from every source (plan §5) --------------------

  const pause = (reason: string): void => {
    if (phase !== 'running') return; // idempotent: only a running clock pauses
    acc = 0;
    session.track('paused', { reason });
    session.save(snapshot());
    setView('paused');
  };

  const resume = (): void => {
    // Idempotent: fires after ads that were suppressed and on a dead board.
    if (phase !== 'paused') return;
    beginCountdown();
  };

  session.onPause(() => pause('ad'));
  session.onResume(resume);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      session.save(snapshot());
      pause('hidden');
    }
  });
  window.addEventListener('pagehide', () => {
    session.save(snapshot());
    pause('pagehide');
  });

  session.onMuteChange((muted) => {
    root.dataset.muted = String(muted); // no audio in v0; state is reflected only
  });
  session.onLocaleChange((loc) => {
    locale = loc;
    strings = stringsFor(loc);
    ui.setStrings(strings, loc);
  });

  // ---- input ----------------------------------------------------------

  const onTurn = (dir: Dir): void => {
    if (phase === 'idle') {
      run = queueTurn(run, dir);
      startRunNow();
      setView('running');
      last = performance.now();
      lastStepAt = last;
      acc = tickMs(); // step on the next frame — no dead ~1-tick pause after the first input
      return;
    }
    if (phase !== 'running') return;

    const turned = queueTurn(run, dir);
    if (turned === run) return; // 180°, a repeat, or the queue is full — nothing changed
    run = turned;

    // Pull the next tick forward so the turn is felt within ~TURN_LAT_MS,
    // clamped so it never lands sooner than (tickMs - TURN_LAT_MS) after the
    // last tick: responsiveness without a free step.
    const nowMs = performance.now();
    const earliest = lastStepAt + tickMs() - TURN_LAT_MS;
    acc = Math.max(acc, nowMs >= earliest ? tickMs() : tickMs() - (earliest - nowMs));
  };
  const input = createInput(ui.surface, onTurn);

  // ---- loop ---------------------------------------------------------

  const frame = (now: number): void => {
    const dt = Math.min(now - last, 250);
    last = now;

    if (phase === 'running') {
      acc += dt;
      let guard = 0;
      while (acc >= tickMs() && guard++ < 8) {
        prev = run;
        run = step(run, rng);
        acc -= tickMs();
        lastStepAt = now;

        if (run.justAte) {
          ateAt = now;
          if (run.score > best) {
            best = run.score;
            if (!bestBeatenFired) {
              bestBeatenFired = true;
              session.track('best_beaten', { score: best });
            }
          }
          session.save(snapshot());
        }
        if (run.dead) {
          onDeath(now);
          break;
        }
      }
    }

    const reduced = REDUCED.matches;
    const t = phase === 'running' ? Math.min(1, acc / tickMs()) : 0;
    renderer.draw({ run, prev, t, reducedMotion: reduced, now, ateAt, deadAt });
    ui.setHud(run.score, best);

    rafId = requestAnimationFrame(frame);
  };
  let rafId = requestAnimationFrame(frame);

  // ---- restore or start fresh (plan §3, brief §5) --------------------

  await session.ready().catch(() => undefined);
  const saved = await session.load();
  if (saved) best = saved.best;

  if (saved?.run) {
    run = fromSavedRun(saved.run);
    prev = null;
    startRunNow(); // a restored run still needs gameStart, or its gameOver is ignored
    ui.setHud(run.score, best);
    setView('paused'); // never drop the player into a moving board
  } else {
    clearFresh();
    ui.setHud(0, best);
    setView('start');
  }

  // vite-plugin-pwa emits sw.js only in a build; the failed registration under
  // `vite dev` is expected (docs/building-a-game.md §9). Registered directly
  // rather than on `load` — `boot()` is async and `load` has usually already
  // fired by the time we get here.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    void navigator.serviceWorker.register('/g/snake/sw.js', { scope: '/g/snake/' });
  }

  void input;

  if (import.meta.env.DEV) {
    (window as unknown as { __snake?: unknown }).__snake = {
      get state(): unknown {
        return { phase, score: run.score, length: run.body.length, dir: run.dir, dead: run.dead, best };
      },
      feedAhead(): void {
        const head = run.body[0];
        if (head === undefined) return;
        const d = run.dir === 'right' ? 1 : run.dir === 'left' ? -1 : run.dir === 'down' ? 15 : -15;
        run = { ...run, food: head + d };
      },
      paintFace(face: 'chomp' | 'dead' | 'dead-flash' | 'cruise'): void {
        cancelAnimationFrame(rafId);
        const now = performance.now();
        const isDead = face === 'dead' || face === 'dead-flash';
        renderer.draw({
          run: { ...run, dead: isDead },
          prev: null,
          t: 0,
          reducedMotion: false,
          now,
          ateAt: face === 'chomp' ? now : null,
          deadAt: face === 'dead-flash' ? now : isDead ? now - 500 : null,
        });
      },
    };
  }
}

void boot();
