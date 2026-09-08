import type { AnalyticsAdapter } from './types.js';

export interface TrackedEvent {
  slug: string;
  event: string;
  props: Record<string, string | number | boolean>;
  at: number;
}

export interface BufferedAnalytics extends AnalyticsAdapter {
  /** Everything seen this session. v0 has no network sink. */
  readonly events: readonly TrackedEvent[];
}

const MAX_EVENTS = 500;

export function createBufferedAnalytics(): BufferedAnalytics {
  const events: TrackedEvent[] = [];
  return {
    events,
    track(slug, event, props) {
      events.push({ slug, event, props, at: Date.now() });
      if (events.length > MAX_EVENTS) events.shift();
      console.debug(`[track] ${slug} ${event}`, props);
    },
  };
}
